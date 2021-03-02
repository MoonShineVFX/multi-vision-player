import { SegmentFetcher, SegmentFetchMeta } from "./segmentFetcher";
import setting from "./setting";


// Define
enum BufferTaskType {
    APPEND,
    REMOVE,
    CHANGE
}

interface BufferTask {
    type: BufferTaskType,
    payload: SegmentFetchMeta | undefined
}

const BufferEvent: {[key: string]: string} = {
    COMPLETE: 'complete'
}

interface FreezeMeta {
    time: number;
    loopSegmentIndices: number[];
}


// Main
class BufferManager {
    private sourceBuffer: SourceBuffer;
    private HTMLElement: HTMLMediaElement;
    private cameraBufferCache: {[key: string]: ArrayBuffer[]};
    private currentCameraIndex: number;
    private segmentFetcher: SegmentFetcher;
    private taskQueue: BufferTask[];
    private isBusy: boolean;
    private eventCallbacks: {[bufferEvent: string]: (() => void)[]};
    private timeSeekBack: boolean;
    private freezeMeta?: FreezeMeta;
    private releaseFreezeMetaTimer?: ReturnType<typeof setTimeout>;

    constructor(sourceBuffer: SourceBuffer, HTMLElement: HTMLMediaElement) {
        console.debug('Initialize BufferManager')
        this.sourceBuffer = sourceBuffer;
        this.HTMLElement = HTMLElement;
        this.cameraBufferCache = {};
        this.currentCameraIndex = 1;
        this.taskQueue = [];
        this.isBusy = false;
        this.eventCallbacks = {};
        this.timeSeekBack = false;
        this.freezeMeta = undefined;
        this.releaseFreezeMetaTimer = undefined;

        // Fill cameraBufferCache with camera count
        [...Array(setting.cameraCount)].forEach((_, cameraIndex) => {
           this.cameraBufferCache[cameraIndex + 1] = [];
        });

        // Apply BufferEvent to callbacks
        Object.values(BufferEvent).forEach(key => {
            this.eventCallbacks[key] = [];
        })

        // Add callback for sourceBuffer and HTMLElement
        this.sourceBuffer.addEventListener(
            'updateend',
            () => this.update()
        );
        this.HTMLElement.addEventListener(
            'timeupdate',
            () => this.checkFetchingNecessary()
        )

        // Segment Fetcher
        this.segmentFetcher = new SegmentFetcher(
            Object.keys(this.cameraBufferCache),
            (cameraIndex, segmentIndex, arrayBuffer) => {
                this.cameraBufferCache[cameraIndex][segmentIndex] = arrayBuffer;
            }
        );

        // Auto run first time
        this.update();
    }

    private update() {
        // No task, back to standby
        if (this.taskQueue.length === 0) {
            this.isBusy = false;
            this.checkFetchingNecessary()
            return;
        }
        if (!this.isBusy) this.isBusy = true;
        if (this.timeSeekBack) {
            this.HTMLElement.currentTime = this.freezeMeta!.time;
            this.timeSeekBack = false;
        }

        // Deal with task
        let task = this.taskQueue.shift()!;
        switch (task.type) {
            // Append
            case BufferTaskType.APPEND:
                const segmentFetchMeta = task.payload!;
                if (segmentFetchMeta.cameraIndex === this.currentCameraIndex) {
                    const buffer = this.cameraBufferCache
                        [segmentFetchMeta.cameraIndex]
                        [segmentFetchMeta.segmentIndex];
                    if (buffer === undefined) {
                        console.error('Undefined');
                        console.error(segmentFetchMeta);
                    }
                    this.sourceBuffer.appendBuffer(buffer);
                }else{
                    this.update();
                }
                return;
            // Change camera
            case BufferTaskType.CHANGE:
                const fetchMeta = task.payload!;
                if (fetchMeta.segmentIndex === -1) {
                    console.error('Index is -1');
                    console.error(fetchMeta);
                    return;
                }
                const buffer = this.cameraBufferCache
                    [fetchMeta.cameraIndex]
                    [fetchMeta.segmentIndex];
                this.timeSeekBack = true;
                this.sourceBuffer.appendBuffer(buffer);
                return;
            // Remove
            case BufferTaskType.REMOVE:
                if (this.HTMLElement.currentTime >= this.getBufferEndTime()) {
                    this.update();
                    return;
                }
                this.sourceBuffer.remove(
                    this.HTMLElement.currentTime,
                    this.getBufferEndTime()
                );
                return;
            default:
                console.error('Wrong Task Type')
        }
    }

    private getBufferEndTime(): number {
        if (this.sourceBuffer.buffered.length === 0) return 0;
        return this.sourceBuffer.buffered.end(0);
    }

    private addTask(taskType: BufferTaskType, payload?: SegmentFetchMeta) {
        this.taskQueue.push({
            type: taskType,
            payload: payload
        })
        // Start update if standby
        if (!this.isBusy) this.update();
    }

    checkFetchingNecessary() {
        // Test file finish and callback once
        if (this.segmentFetcher.currentIndex >= 121) {
            if (this.sourceBuffer.updating) return;
            this.eventCallbacks[BufferEvent.COMPLETE].forEach(callbackFunc => {
                callbackFunc();
            })
            return;
        }

        // Check busy
        if (this.isBusy || this.segmentFetcher.isFetching) return;

        // Fetch if not enough buffered
        if (this.getBufferEndTime() - this.HTMLElement.currentTime < setting.bufferPreCacheLength) {
            this.segmentFetcher.fetch(
                this.currentCameraIndex
            ).then(segmentFetchResult => {
                this.addTask(
                    BufferTaskType.APPEND,
                    segmentFetchResult
                )
            })
        }
    }

    clearFreezeMeta() {
        this.freezeMeta = undefined;
        this.releaseFreezeMetaTimer = undefined;
    }

    changeCamera(step: number) {
        // Bound camera index
        const tempCameraIndex = this.currentCameraIndex + step;
        if (tempCameraIndex > setting.cameraCount) {
            return;
        }
        if (tempCameraIndex <= 0) {
            return;
        }

        // Change camera index
        const currentCameraIndex = this.currentCameraIndex + step;
        this.currentCameraIndex = currentCameraIndex;

        // Freeze Meta
        if (this.freezeMeta === undefined) {
            const currentTime = this.HTMLElement.currentTime;
            const playSegmentIndex = Math.max(Math.floor(currentTime * setting.segmentPerSecond) - 1, 0);
            const cameraBufferCache = this.cameraBufferCache[currentCameraIndex];
            const loopCount = cameraBufferCache.length - playSegmentIndex;
            this.freezeMeta = {
                time: currentTime,
                loopSegmentIndices: [...Array(loopCount).keys()].map(i => i + playSegmentIndex)
            }
        }
        if (this.releaseFreezeMetaTimer !== undefined) {
            clearTimeout(this.releaseFreezeMetaTimer!);
        }
        this.releaseFreezeMetaTimer = setTimeout(
            () => this.clearFreezeMeta(),
            setting.freezeTimeDelay * 1000
        );

        this.freezeMeta.loopSegmentIndices.forEach((thisSegmentIndex, index) => {
            let taskType: BufferTaskType;
            if (index === 0) {
                taskType = BufferTaskType.CHANGE
            } else {
                taskType = BufferTaskType.APPEND
            }
            this.addTask(
                taskType,
                {
                    cameraIndex: currentCameraIndex,
                    segmentIndex: thisSegmentIndex
                }
            )
        });
    }

    on(bufferEvent: string, callback: () => void) {
        const callbacks = this.eventCallbacks[bufferEvent];
        if (!callbacks.includes(callback)) {
            this.eventCallbacks[bufferEvent].push(callback);
        }
    }
}


export {BufferManager, BufferEvent};
