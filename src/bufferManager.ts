import { SegmentFetcher, SegmentFetchMeta } from "./segmentFetcher";
import setting from "./setting";


// Define
enum BufferTaskType {
    APPEND,
    REMOVE
}

interface BufferTask {
    type: BufferTaskType,
    payload: SegmentFetchMeta | undefined
}

const BufferEvent: {[key: string]: string} = {
    COMPLETE: 'complete'
}


// Main
class BufferManager {
    private sourceBuffer: SourceBuffer;
    private HTMLElement: HTMLMediaElement;
    private cameraBufferCache: {[key: string]: ArrayBuffer[]};
    private currentSegmentIndex: number;
    private currentCameraIndex: number;
    private segmentFetcher: SegmentFetcher;
    private taskQueue: BufferTask[];
    private isBusy: boolean;
    private eventCallbacks: {[bufferEvent: string]: (() => void)[]};

    constructor(sourceBuffer: SourceBuffer, HTMLElement: HTMLMediaElement) {
        console.debug('Initialize BufferManager')
        this.sourceBuffer = sourceBuffer;
        this.HTMLElement = HTMLElement;
        this.cameraBufferCache = {};
        this.currentSegmentIndex = 0;
        this.currentCameraIndex = 1;
        this.taskQueue = [];
        this.isBusy = false;
        this.eventCallbacks = {};

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
                    console.debug('Skip invalid append');
                    this.update();
                }
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
        // Test file finish
        if (this.currentSegmentIndex >= 121) {
            this.eventCallbacks[BufferEvent.COMPLETE].forEach(callbackFunc => {
                callbackFunc();
            })
            this.currentSegmentIndex += 1;
            return;
        }

        // Check busy
        if (this.isBusy || this.segmentFetcher.isFetching) return;

        // Fetch if not enough buffered
        if (this.getBufferEndTime() - this.HTMLElement.currentTime < setting.bufferPreCacheLength) {
            this.segmentFetcher.fetch(
                this.currentCameraIndex, this.currentSegmentIndex
            ).then(segmentFetchResult => {
                this.currentSegmentIndex += 1;
                this.addTask(
                    BufferTaskType.APPEND,
                    segmentFetchResult
                )
            })
        }
    }

    changeCamera(step: number) {
        // bound camera index
        const tempCameraIndex = this.currentCameraIndex + step;
        if (tempCameraIndex > setting.cameraCount) {
            return;
        }
        if (tempCameraIndex <= 0) {
            return;
        }

        // Clear buffer
        this.taskQueue = [];
        this.addTask(BufferTaskType.REMOVE)

        // Add new camera buffer
        const currentCameraIndex = this.currentCameraIndex + step;
        this.currentCameraIndex = currentCameraIndex;

        const playSegmentIndex = Math.floor(this.HTMLElement.currentTime * setting.segmentPerSecond) - 1;
        const cameraBufferCache = this.cameraBufferCache[currentCameraIndex];
        const loopCount = cameraBufferCache.length - playSegmentIndex;

        [...Array(loopCount)].forEach((_, index) => {
            const segmentIndex = index + playSegmentIndex;
            this.addTask(
                BufferTaskType.APPEND,
                {
                    cameraIndex: currentCameraIndex,
                    segmentIndex: segmentIndex
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
