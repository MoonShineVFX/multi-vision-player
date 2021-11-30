import { SegmentFetcher, SegmentCacheMeta } from "./segmentFetcher";
import MultiVisionPlayer from "./player";
import setting from "./setting";


// Define
enum BufferTaskType {
    APPEND,
    PURGE,
    CHANGE,
    RESUME,
    RESET
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
    private player: MultiVisionPlayer;

    private cameraBufferCache: {[key: string]: (ArrayBuffer | null)[]};
    private segmentFetcher: SegmentFetcher;

    private taskQueue: BufferTask[];
    private eventCallbacks: {[bufferEvent: string]: (() => void)[]};

    private freezeMeta?: FreezeMeta;
    private releaseFreezeMetaTimer?: ReturnType<typeof setTimeout>;

    private currentCameraIndex: number;
    private purgeTriggerTime: number;

    private isBusyProcessingTask: boolean;
    private isCachingCompleted: boolean;
    private isAutoplayAfterPrecaching: boolean;

    constructor(videoBuffer: SourceBuffer, audioBuffer: SourceBuffer, player: MultiVisionPlayer) {
        console.info('Initialize BufferManager')
        this.videoBuffer = videoBuffer;
        this.audioBuffer = audioBuffer;
        this.player = player;
        this.cameraBufferCache = {};
        this.currentCameraIndex = 1;
        this.taskQueue = [];
        this.isBusyProcessingTask = false;
        this.isCachingCompleted = false;
        this.eventCallbacks = {};
        this.freezeMeta = undefined;
        this.releaseFreezeMetaTimer = undefined;
        this.purgeTriggerTime = setting.cachePurgeInterval + setting.purgePreservedLength;
        this.isAutoplayAfterPrecaching = true;

        // Create buffer cache
        this.initialBufferCache();

        // Apply BufferEvent to callbacks
        Object.values(BufferEvent).forEach(key => {
            this.eventCallbacks[key] = [];
        })

        // Add callback for videoBuffer and HTMLElement
        this.videoBuffer.addEventListener(
            'updateend',
            () => this.processTask()
        );
        this.player.addEventListener(
            'timeupdate',
            () => this.checkFetchingNecessary()
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

    private initialBufferCache() {
        // Fill cameraBufferCache with camera count
        [...Array(setting.cameraCount)].forEach((_, cameraIndex) => {
            this.cameraBufferCache[cameraIndex + 1] = [];
        });
        this.cameraBufferCache['audio'] = [];
    }

    private processTask() {
        console.debug('Process Task')
        // No task, back to standby
        if (this.taskQueue.length === 0) {
            console.debug('Standby')
            this.isBusyProcessingTask = false;

            if (!this.isCachingCompleted) this.checkFetchingNecessary();
            return;
        }

        if (!this.isBusyProcessingTask) this.isBusyProcessingTask = true;

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
                this.player.setCurrentTime(
                    BufferManager.getTimeBySegmentIndex(changeMeta.segmentIndex)  // Must minus one if segment 0.1
                );
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
                this.player.setCurrentTime(
                    BufferManager.getTimeBySegmentIndex(freezeMeta.segmentIndex)  // Must minus one if segment 0.1
                );
                if (!freezeMeta.isPaused) {
                    this.player.play()
                }
                this.player.unMute();

                this.processTask();
                return;
            // Reset
            case BufferTaskType.RESET:
                console.debug('BufferTask[Reset]');
                this.taskQueue = [];
                this.initialBufferCache();
                const newTime: number = task.payload!;
                const newIndex = BufferManager.getSegmentIndexByTime(newTime);
                this.segmentFetcher.currentIndex = Math.max(newIndex - 1, 0);  // Must minus one or it will hang
                this.processTask();
                this.purgeTriggerTime = setting.cachePurgeInterval + setting.purgePreservedLength + newTime;
                this.isAutoplayAfterPrecaching = true;
                this.player.setCurrentTime(newTime + 1);  // Must plus one or it will hang
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
        if (!this.isBusyProcessingTask) this.processTask();
    }

    private checkFetchingNecessary() {
        if (this.isCachingCompleted) return;

        console.debug('Check fetching necessary')
        // Test file finish and callback once
        if (this.segmentFetcher.currentIndex >= setting.endSegment && !this.isCachingCompleted) {
            if (this.videoBuffer.updating) return;
            this.eventCallbacks[BufferEvent.COMPLETE].forEach(callbackFunc => {
                callbackFunc();
            })
            console.debug('Complete test, not fetch.');
            this.isCachingCompleted = true;
            return;
        }

        // Purge played buffer for memory optimization
        if (this.player.getCurrentTime() > this.purgeTriggerTime) {
            this.addTask(
                BufferTaskType.PURGE,
                this.purgeTriggerTime
            );
            this.purgeTriggerTime += setting.cachePurgeInterval;
        }

        // Check busy
        if (this.isBusyProcessingTask || this.segmentFetcher.isFetching) {
            console.debug('Is busy, no fetch.');
            return;
        }

        // Fetch if not enough buffered
        const cacheLength =
            BufferManager.getTimeBySegmentIndex(this.segmentFetcher.currentIndex) - this.player.getCurrentTime();
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
        } else if (this.isAutoplayAfterPrecaching) {
            console.debug('Autoplay due to complete caching')
            this.isAutoplayAfterPrecaching = false;
            this.player.play();
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

    resetOnTime(time: number) {
        this.addTask(
            BufferTaskType.RESET,
            time
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
            const isPlayerPaused = this.player.isPaused();
            if (isPlayerPaused) this.player.pause();
            this.player.mute();

            // Set freeze meta
            const currentTime = this.player.getCurrentTime();
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
