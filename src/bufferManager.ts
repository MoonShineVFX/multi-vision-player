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
    private audioBuffer: SourceBuffer;
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
    private isPlayerPaused: boolean;

    constructor(sourceBuffer: SourceBuffer, audioBuffer: SourceBuffer, HTMLElement: HTMLMediaElement) {
        console.debug('Initialize BufferManager')
        this.sourceBuffer = sourceBuffer;
        this.audioBuffer = audioBuffer;
        this.HTMLElement = HTMLElement;
        this.cameraBufferCache = {};
        this.currentCameraIndex = 1;
        this.taskQueue = [];
        this.isBusy = false;
        this.eventCallbacks = {};
        this.timeSeekBack = false;
        this.freezeMeta = undefined;
        this.releaseFreezeMetaTimer = undefined;
        this.isPlayerPaused = false;

        // Fill cameraBufferCache with camera count
        [...Array(setting.cameraCount)].forEach((_, cameraIndex) => {
           this.cameraBufferCache[cameraIndex + 1] = [];
        });
        this.cameraBufferCache['audio'] = [];

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
        console.debug('Update')
        // No task, back to standby
        if (this.taskQueue.length === 0) {
            console.debug('Standby')
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
                console.debug('BufferTask[Append]')
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

                    // Add audio
                    const audioBuffer = this.cameraBufferCache['audio'][segmentFetchMeta.segmentIndex];
                    this.audioBuffer.appendBuffer(audioBuffer)
                }else{
                    this.update();
                }
                return;
            // Change camera
            case BufferTaskType.CHANGE:
                console.debug('BufferTask[CHANGE]')
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
                console.debug('BufferTask[Remove]')
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
        console.debug('Check fetching necessary')
        // Test file finish and callback once
        if (this.segmentFetcher.currentIndex >= 121) {
            if (this.sourceBuffer.updating) return;
            this.eventCallbacks[BufferEvent.COMPLETE].forEach(callbackFunc => {
                callbackFunc();
            })
            console.debug('Complete test, not fetch.');
            return;
        }

        // Check busy
        if (this.isBusy || this.segmentFetcher.isFetching) {
            console.debug('Is busy, no fetch.');
            return;
        }

        // Fetch if not enough buffered
        if (this.getBufferEndTime() - this.HTMLElement.currentTime < setting.bufferPreCacheLength) {
            console.debug('Need more buffer, fetch.');
            this.segmentFetcher.fetch(
                this.currentCameraIndex
            ).then(segmentFetchResult => {
                this.addTask(
                    BufferTaskType.APPEND,
                    segmentFetchResult
                )
            })
        }

        console.debug('End of checking');
    }

    clearFreezeMeta() {
        this.freezeMeta = undefined;
        this.releaseFreezeMetaTimer = undefined;
        if (!this.isPlayerPaused) this.HTMLElement.play();
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

        // Freeze Meta | Start change camera
        if (this.freezeMeta === undefined) {
            // Mark player paused state
            this.isPlayerPaused = this.HTMLElement.paused;
            if (!this.isPlayerPaused) this.HTMLElement.pause();

            // Set freeze meta
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
