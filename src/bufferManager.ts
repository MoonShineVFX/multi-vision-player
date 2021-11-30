import { SegmentFetcher, SegmentCacheMeta } from "./segmentFetcher";
import setting from "./setting";


// Define
enum BufferTaskType {
    APPEND,
    PURGE,
    CHANGE,
    RESUME
}

interface BufferTask {
    type: BufferTaskType,
    payload: any | undefined
}

const BufferEvent: {[key: string]: string} = {
    COMPLETE: 'complete'
}

interface FreezeMeta {
    time: number;
    segmentIndex: number;
    isPaused: boolean;
}


// Main
class BufferManager {
    private videoBuffer: SourceBuffer;
    private audioBuffer: SourceBuffer;
    private HTMLElement: HTMLMediaElement;
    private cameraBufferCache: {[key: string]: (ArrayBuffer | null)[]};
    private currentCameraIndex: number;
    private segmentFetcher: SegmentFetcher;
    private taskQueue: BufferTask[];
    private isBusy: boolean;
    private isCompleted: boolean;
    private eventCallbacks: {[bufferEvent: string]: (() => void)[]};
    private freezeMeta?: FreezeMeta;
    private releaseFreezeMetaTimer?: ReturnType<typeof setTimeout>;
    private updateCallback: () => void;
    private purgeTriggerTime: number;
    private playAfterCaching: boolean;

    constructor(videoBuffer: SourceBuffer, audioBuffer: SourceBuffer, HTMLElement: HTMLMediaElement) {
        console.info('Initialize BufferManager')
        this.videoBuffer = videoBuffer;
        this.audioBuffer = audioBuffer;
        this.HTMLElement = HTMLElement;
        this.cameraBufferCache = {};
        this.currentCameraIndex = 1;
        this.taskQueue = [];
        this.isBusy = false;
        this.isCompleted = false;
        this.eventCallbacks = {};
        this.freezeMeta = undefined;
        this.releaseFreezeMetaTimer = undefined;
        this.updateCallback = () => this.checkFetchingNecessary();
        this.purgeTriggerTime = setting.cachePurgeInterval + setting.purgePreservedLength;
        this.playAfterCaching = true;

        // Fill cameraBufferCache with camera count
        [...Array(setting.cameraCount)].forEach((_, cameraIndex) => {
           this.cameraBufferCache[cameraIndex + 1] = [];
        });
        this.cameraBufferCache['audio'] = [];

        // Apply BufferEvent to callbacks
        Object.values(BufferEvent).forEach(key => {
            this.eventCallbacks[key] = [];
        })

        // Add callback for videoBuffer and HTMLElement
        this.videoBuffer.addEventListener(
            'updateend',
            () => this.processTask()
        );
        this.HTMLElement.addEventListener(
            'timeupdate',
            this.updateCallback
        )
        this.HTMLElement.addEventListener(
            'seeked',
            () => {console.log('SEEKED')}
        )
        this.HTMLElement.addEventListener(
            'suspend',
            () => {console.log('SUSPEND')}
        )
        this.HTMLElement.addEventListener(
            'stalled',
            () => {console.log('STALLED')}
        )
        this.HTMLElement.addEventListener(
            'seeking',
            e => {console.log(e)}
        )

        // Segment Fetcher
        this.segmentFetcher = new SegmentFetcher(
            (cameraIndex, segmentIndex, arrayBuffer) => {
                this.cameraBufferCache[cameraIndex][segmentIndex] = arrayBuffer;
            }
        );

        // Auto run first time
        this.processTask();
    }

    private static getSegmentIndexByTime(time: number) {
        return Math.max(Math.floor(time * setting.segmentPerSecond), 0);
    }

    private static getTimeBySegmentIndex(index: number) {
        if (index < 0) return 0;
        return index / setting.segmentPerSecond;
    }

    private processTask() {
        console.debug('Process Task')
        // No task, back to standby
        if (this.taskQueue.length === 0) {
            console.debug('Standby')
            this.isBusy = false;

            if (!this.isCompleted) this.checkFetchingNecessary();
            return;
        }

        if (!this.isBusy) this.isBusy = true;

        // Deal with task
        let task = this.taskQueue.shift()!;
        if (task === undefined) {
            console.error('Task queue is empty.')
            return;
        }

        switch (task.type) {
            // Append
            case BufferTaskType.APPEND:
                console.debug('BufferTask[Append]')
                const segmentCacheMeta: SegmentCacheMeta = task.payload!;
                if (segmentCacheMeta.segmentIndex === -1) {
                    console.warn('Index is -1');
                    console.warn(segmentCacheMeta);
                    this.processTask();
                    return;
                }
                if (segmentCacheMeta.cameraIndex === this.currentCameraIndex) {
                    // Add(Replace) video
                    const buffer = this.cameraBufferCache
                        [segmentCacheMeta.cameraIndex]
                        [segmentCacheMeta.segmentIndex];
                    if (buffer === undefined) {
                        console.warn('Buffer is undefined');
                        console.warn(segmentCacheMeta);
                    }
                    this.videoBuffer.appendBuffer(buffer!);

                    // Add audio
                    if (this.freezeMeta === undefined) {
                        const audioBuffer = this.cameraBufferCache['audio'][segmentCacheMeta.segmentIndex];
                        this.audioBuffer.appendBuffer(audioBuffer!);
                    }
                }else{
                    this.processTask();
                }
                return;
            // Change camera
            case BufferTaskType.CHANGE:
                console.debug('BufferTask[CHANGE]')
                const changeMeta: SegmentCacheMeta = task.payload!;
                if (changeMeta.segmentIndex === -1) {
                    console.warn('Index is -1');
                    console.warn(changeMeta);
                    this.processTask();
                    return;
                }
                const buffer = this.cameraBufferCache
                    [changeMeta.cameraIndex]
                    [changeMeta.segmentIndex];
                this.videoBuffer.appendBuffer(buffer!);
                this.HTMLElement.currentTime =
                    BufferManager.getTimeBySegmentIndex(changeMeta.segmentIndex - 1);
                return;
            // Purge
            case BufferTaskType.PURGE:
                console.debug('BufferTask[Purge]');
                // Get purge range
                const removeEndTime: number = task.payload! - setting.purgePreservedLength;
                const removeStartTime = removeEndTime - setting.cachePurgeInterval

                // Remove from SourceBuffer
                this.videoBuffer.remove(removeStartTime, removeEndTime);
                this.audioBuffer.remove(removeStartTime, removeEndTime);

                // Convert purge range to index
                const removeStartSegmentIndex = BufferManager.getSegmentIndexByTime(removeStartTime);
                const removeEndSegmentIndex = BufferManager.getSegmentIndexByTime(removeEndTime)

                // Remove from camera buffer cache
                Object.values(this.cameraBufferCache).forEach(bufferCache => {
                    for (let i = removeStartSegmentIndex; i < removeEndSegmentIndex + 1; i++) {
                        bufferCache[i] = null;
                    }
                });
                return;
            // Resume
            case BufferTaskType.RESUME:
                console.debug('BufferTask[Resume]');
                // Calculate the videoBuffer range which should replace by new camera
                const freezeMeta: FreezeMeta = task.payload!;
                const cameraBuffer = this.cameraBufferCache[this.currentCameraIndex];
                const lastIndex = Number(Object.keys(cameraBuffer)[Object.keys(cameraBuffer).length - 1]);

                // Check replace needed
                if (lastIndex > freezeMeta.segmentIndex + 1) {
                    console.debug(`Resume cache: ${freezeMeta.segmentIndex} => ${lastIndex}`);
                    for (let i = freezeMeta.segmentIndex + 2; i < lastIndex + 1; i++) {
                        this.addTask(
                            BufferTaskType.APPEND,
                            {
                                cameraIndex: this.currentCameraIndex,
                                segmentIndex: i
                            }
                        )
                    }
                }

                // Resume playback
                this.HTMLElement.currentTime =
                    BufferManager.getTimeBySegmentIndex(freezeMeta.segmentIndex - 1);
                if (!freezeMeta.isPaused) {
                    this.HTMLElement.play().catch(
                        reason => console.error(reason)
                    )
                }

                this.processTask();
                return;
            default:
                console.error('Wrong Task Type');
        }
    }

    private addTask(taskType: BufferTaskType, payload?: any) {
        this.taskQueue.push({
            type: taskType,
            payload: payload
        })
        // Start update if standby
        if (!this.isBusy) this.processTask();
    }

    private checkFetchingNecessary() {
        console.debug('Check fetching necessary')
        // Test file finish and callback once
        if (this.segmentFetcher.currentIndex >= setting.endSegment && !this.isCompleted) {
            if (this.videoBuffer.updating) return;
            this.eventCallbacks[BufferEvent.COMPLETE].forEach(callbackFunc => {
                callbackFunc();
            })
            console.debug('Complete test, not fetch.');
            this.HTMLElement.removeEventListener(
                'timeupdate',
                this.updateCallback
            )
            this.isCompleted = true;
            return;
        }

        // Purge played buffer for memory optimization
        if (this.HTMLElement.currentTime > this.purgeTriggerTime) {
            this.addTask(
                BufferTaskType.PURGE,
                this.purgeTriggerTime
            );
            this.purgeTriggerTime += setting.cachePurgeInterval;
        }

        // Check busy
        if (this.isBusy || this.segmentFetcher.isFetching) {
            console.debug('Is busy, no fetch.');
            return;
        }

        // Fetch if not enough buffered
        const cacheLength =
            BufferManager.getTimeBySegmentIndex(this.segmentFetcher.currentIndex) - this.HTMLElement.currentTime;
        if (cacheLength < setting.bufferPreCacheLength) {
            console.debug('Need more buffer, fetch.');
            this.segmentFetcher.fetchSegment(
                this.currentCameraIndex
            ).then(segmentFetchResult => {
                this.addTask(
                    BufferTaskType.APPEND,
                    segmentFetchResult
                )
            })
        } else if (this.playAfterCaching) {
            this.playAfterCaching = false;
            this.HTMLElement.play().catch(
                reason => console.error(reason)
            )
        }

        console.debug('End of checking');
    }

    private clearFreezeMeta() {
        // Clear freeze temp data
        const freezeMetaPayload = this.freezeMeta;
        this.freezeMeta = undefined;
        if (this.releaseFreezeMetaTimer !== undefined) {
            clearTimeout(this.releaseFreezeMetaTimer!);
        }
        this.releaseFreezeMetaTimer = undefined;
        this.addTask(
            BufferTaskType.RESUME,
            freezeMetaPayload
        )
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
        console.info(`Change camera to ${this.currentCameraIndex}`)

        // Freeze Meta | Start change camera
        if (this.freezeMeta === undefined) {
            // Mark player paused state
            const isPlayerPaused = this.HTMLElement.paused;
            if (isPlayerPaused) this.HTMLElement.pause();

            // Set freeze meta
            const currentTime = this.HTMLElement.currentTime;
            const playSegmentIndex = BufferManager.getSegmentIndexByTime(currentTime);
            this.freezeMeta = {
                time: currentTime,
                segmentIndex: playSegmentIndex,
                isPaused: isPlayerPaused
            }
            console.debug(this.freezeMeta)
        }
        if (this.releaseFreezeMetaTimer !== undefined) {
            clearTimeout(this.releaseFreezeMetaTimer!);
        }
        this.releaseFreezeMetaTimer = setTimeout(
            () => this.clearFreezeMeta(),
            setting.freezeTimeDelay * 1000
        );

        this.addTask(
            BufferTaskType.APPEND,
            {
                cameraIndex: currentCameraIndex,
                segmentIndex: this.freezeMeta.segmentIndex - 1
            }
        )
        this.addTask(
            BufferTaskType.CHANGE,
            {
                cameraIndex: currentCameraIndex,
                segmentIndex: this.freezeMeta.segmentIndex
            }
        )
        this.addTask(
            BufferTaskType.APPEND,
            {
                cameraIndex: currentCameraIndex,
                segmentIndex: this.freezeMeta.segmentIndex + 1
            }
        )
    }

    on(bufferEvent: string, callback: () => void) {
        const callbacks = this.eventCallbacks[bufferEvent];
        if (!callbacks.includes(callback)) {
            this.eventCallbacks[bufferEvent].push(callback);
        }
    }
}


export {BufferManager, BufferEvent};
