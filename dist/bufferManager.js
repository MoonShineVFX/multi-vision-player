"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferEvent = exports.BufferManager = void 0;
var segmentFetcher_1 = require("./segmentFetcher");
var setting_1 = require("./setting");
// Define
var BufferTaskType;
(function (BufferTaskType) {
    BufferTaskType[BufferTaskType["APPEND"] = 0] = "APPEND";
    BufferTaskType[BufferTaskType["PURGE"] = 1] = "PURGE";
    BufferTaskType[BufferTaskType["CHANGE"] = 2] = "CHANGE";
    BufferTaskType[BufferTaskType["RESUME"] = 3] = "RESUME";
    BufferTaskType[BufferTaskType["RESET"] = 4] = "RESET";
})(BufferTaskType || (BufferTaskType = {}));
var BufferEvent;
(function (BufferEvent) {
    BufferEvent[BufferEvent["CHANGE_CAMERA"] = 0] = "CHANGE_CAMERA";
    BufferEvent[BufferEvent["COMPLETE"] = 1] = "COMPLETE";
})(BufferEvent || (BufferEvent = {}));
exports.BufferEvent = BufferEvent;
// Main
var BufferManager = /** @class */ (function () {
    function BufferManager(videoBuffer, audioBuffer, player) {
        var _this = this;
        console.info('Initialize BufferManager');
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
        this.purgeTriggerTime = setting_1.default.cachePurgeInterval + setting_1.default.purgePreservedLength;
        this.isAutoplayAfterPrecaching = true;
        // Change purgeTriggerTime
        if (setting_1.default.liveStreaming)
            this.purgeTriggerTime += this.player.getCurrentTime();
        // Create buffer cache
        this.initialBufferCache();
        // Apply BufferEvent to callbacks
        Object.values(BufferEvent).forEach(function (key) {
            _this.eventCallbacks[key] = [];
        });
        // Add callback for videoBuffer and HTMLElement
        this.videoBuffer.addEventListener('updateend', function () { return _this.processTask(); });
        this.player.addEventListener('timeupdate', function () { return _this.checkFetchingNecessary(); });
        // Segment Fetcher
        this.segmentFetcher = new segmentFetcher_1.SegmentFetcher(function (cameraIndex, segmentIndex, arrayBuffer) {
            _this.cameraBufferCache[cameraIndex][segmentIndex] = arrayBuffer;
        }, this.audioBuffer !== null);
        // Auto run first time
        if (!setting_1.default.liveStreaming) {
            this.processTask();
        }
        else {
            this.segmentFetcher.fetchSegment(this.currentCameraIndex).then(function (segmentFetchResult) {
                _this.segmentFetcher.currentIndex = setting_1.default.initialSegmentNumber;
                _this.addTask(BufferTaskType.APPEND, segmentFetchResult);
                _this.processTask();
            });
        }
    }
    BufferManager.getSegmentIndexByTime = function (time) {
        return Math.max(Math.floor(time * setting_1.default.segmentsPerSecond), 0);
    };
    BufferManager.getTimeBySegmentIndex = function (index) {
        if (index < 0)
            return 0;
        return index / setting_1.default.segmentsPerSecond;
    };
    BufferManager.prototype.initialBufferCache = function () {
        var _this = this;
        // Fill cameraBufferCache with camera count
        __spreadArray([], Array(setting_1.default.cameraCount)).forEach(function (_, cameraIndex) {
            _this.cameraBufferCache[cameraIndex + 1] = [];
        });
        this.cameraBufferCache['audio'] = [];
    };
    BufferManager.prototype.processTask = function () {
        console.debug('Process Task');
        // No task, back to standby
        if (this.taskQueue.length === 0) {
            console.debug('Standby');
            this.isBusyProcessingTask = false;
            if (!this.isCachingCompleted)
                this.checkFetchingNecessary();
            return;
        }
        if (!this.isBusyProcessingTask)
            this.isBusyProcessingTask = true;
        // Deal with task
        var task = this.taskQueue.shift();
        if (task === undefined) {
            console.error('Task queue is empty.');
            return;
        }
        switch (task.type) {
            // Append
            case BufferTaskType.APPEND:
                console.debug('BufferTask[Append]');
                var segmentCacheMeta = task.payload;
                if (segmentCacheMeta.segmentIndex === -1) {
                    console.warn('Index is -1');
                    console.warn(segmentCacheMeta);
                    this.processTask();
                    return;
                }
                if (segmentCacheMeta.cameraIndex === this.currentCameraIndex) {
                    // Add(Replace) video
                    var buffer_1 = this.cameraBufferCache[segmentCacheMeta.cameraIndex][segmentCacheMeta.segmentIndex];
                    if (buffer_1 === undefined) {
                        console.warn('Buffer is undefined');
                        console.warn(segmentCacheMeta);
                    }
                    this.videoBuffer.appendBuffer(buffer_1);
                    // Add audio
                    if (this.freezeMeta === undefined && this.audioBuffer) {
                        var audioBuffer = this.cameraBufferCache['audio'][segmentCacheMeta.segmentIndex];
                        this.audioBuffer.appendBuffer(audioBuffer);
                    }
                }
                else {
                    this.processTask();
                }
                return;
            // Change camera
            case BufferTaskType.CHANGE:
                console.debug('BufferTask[CHANGE]');
                var changeMeta = task.payload;
                if (changeMeta.segmentIndex === -1) {
                    console.warn('Index is -1');
                    console.warn(changeMeta);
                    this.processTask();
                    return;
                }
                var buffer = this.cameraBufferCache[changeMeta.cameraIndex][changeMeta.segmentIndex];
                this.videoBuffer.appendBuffer(buffer);
                this.player.setCurrentTime(BufferManager.getTimeBySegmentIndex(
                // Offset must 1 if segment 0.1
                changeMeta.segmentIndex + setting_1.default.resumeSegmentIndexOffset));
                return;
            // Purge
            case BufferTaskType.PURGE:
                console.debug('BufferTask[Purge]');
                // Get purge range
                var removeEndTime = task.payload - setting_1.default.purgePreservedLength;
                var removeStartTime = removeEndTime - setting_1.default.cachePurgeInterval;
                // Remove from SourceBuffer
                this.videoBuffer.remove(removeStartTime, removeEndTime);
                if (this.audioBuffer) {
                    this.audioBuffer.remove(removeStartTime, removeEndTime);
                }
                // Convert purge range to index
                var removeStartSegmentIndex_1 = BufferManager.getSegmentIndexByTime(removeStartTime);
                var removeEndSegmentIndex_1 = BufferManager.getSegmentIndexByTime(removeEndTime);
                // Remove from camera buffer cache
                Object.values(this.cameraBufferCache).forEach(function (bufferCache) {
                    for (var i = removeStartSegmentIndex_1; i < removeEndSegmentIndex_1 + 1; i++) {
                        bufferCache[i] = null;
                    }
                });
                return;
            // Resume
            case BufferTaskType.RESUME:
                console.debug('BufferTask[Resume]');
                // Calculate the videoBuffer range which should replace by new camera
                var freezeMeta = task.payload;
                var cameraBuffer = this.cameraBufferCache[this.currentCameraIndex];
                var lastIndex = Number(Object.keys(cameraBuffer)[Object.keys(cameraBuffer).length - 1]);
                // Check replace needed
                if (lastIndex > freezeMeta.segmentIndex + 1) {
                    console.debug("Resume cache: " + freezeMeta.segmentIndex + " => " + lastIndex);
                    for (var i = freezeMeta.segmentIndex + 2; i < lastIndex + 1; i++) {
                        this.addTask(BufferTaskType.APPEND, {
                            cameraIndex: this.currentCameraIndex,
                            segmentIndex: i
                        });
                    }
                }
                // Resume playback
                this.player.setCurrentTime(
                // Offset must one if segment 0.1
                BufferManager.getTimeBySegmentIndex(freezeMeta.segmentIndex + setting_1.default.resumeSegmentIndexOffset));
                if (!freezeMeta.isPaused) {
                    this.player.play();
                }
                this.player.unMute();
                this.processTask();
                return;
            // Reset
            case BufferTaskType.RESET:
                console.debug('BufferTask[Reset]');
                this.taskQueue = [];
                this.initialBufferCache();
                var newTime = task.payload;
                var newIndex = BufferManager.getSegmentIndexByTime(newTime);
                this.segmentFetcher.currentIndex = Math.max(newIndex - 1, 0); // Must minus one or it will hang
                // this.processTask();
                this.purgeTriggerTime = setting_1.default.cachePurgeInterval + setting_1.default.purgePreservedLength + newTime;
                this.isAutoplayAfterPrecaching = true;
                this.player.setCurrentTime(newTime + 1); // Must plus one or it will hang
                this.processTask();
                return;
            default:
                console.error('Wrong Task Type');
        }
    };
    BufferManager.prototype.addTask = function (taskType, payload) {
        this.taskQueue.push({
            type: taskType,
            payload: payload
        });
        // Start update if standby
        if (!this.isBusyProcessingTask)
            this.processTask();
    };
    BufferManager.prototype.checkFetchingNecessary = function () {
        var _this = this;
        if (this.isCachingCompleted)
            return;
        console.debug('Check fetching necessary');
        // Test file finish and callback once
        if (!setting_1.default.liveStreaming && this.segmentFetcher.currentIndex >= setting_1.default.endSegment && !this.isCachingCompleted) {
            if (this.videoBuffer.updating)
                return;
            this.eventCallbacks[BufferEvent.COMPLETE].forEach(function (callbackFunc) {
                callbackFunc();
            });
            console.debug('Complete test, not fetch.');
            this.isCachingCompleted = true;
            return;
        }
        // Purge played buffer for memory optimization
        if (this.player.getCurrentTime() > this.purgeTriggerTime) {
            this.addTask(BufferTaskType.PURGE, this.purgeTriggerTime);
            this.purgeTriggerTime += setting_1.default.cachePurgeInterval;
        }
        // Check busy
        if (this.isBusyProcessingTask || this.segmentFetcher.isFetching) {
            console.debug('Is busy, no fetch.');
            return;
        }
        // Fetch if not enough buffered
        var cacheLength = BufferManager.getTimeBySegmentIndex(this.segmentFetcher.currentIndex) - this.player.getCurrentTime();
        if (cacheLength < setting_1.default.bufferPreCacheLength) {
            console.debug('Need more buffer, fetch.');
            this.segmentFetcher.fetchSegment(this.currentCameraIndex).then(function (segmentFetchResult) {
                _this.addTask(BufferTaskType.APPEND, segmentFetchResult);
            });
        }
        else if (this.isAutoplayAfterPrecaching) {
            console.debug('Autoplay due to complete caching');
            this.isAutoplayAfterPrecaching = false;
            this.player.play();
        }
        console.debug('End of checking');
    };
    BufferManager.prototype.clearFreezeMeta = function () {
        // Clear freeze temp data
        var freezeMetaPayload = this.freezeMeta;
        this.freezeMeta = undefined;
        if (this.releaseFreezeMetaTimer !== undefined) {
            clearTimeout(this.releaseFreezeMetaTimer);
        }
        this.releaseFreezeMetaTimer = undefined;
        this.addTask(BufferTaskType.RESUME, freezeMetaPayload);
    };
    BufferManager.prototype.resetOnTime = function (time) {
        this.addTask(BufferTaskType.RESET, time);
    };
    BufferManager.prototype.changeCamera = function (step) {
        var _this = this;
        // Bound camera index
        var tempCameraIndex = this.currentCameraIndex + step;
        if (tempCameraIndex > setting_1.default.cameraCount) {
            return;
        }
        if (tempCameraIndex <= 0) {
            return;
        }
        // Change camera index
        var currentCameraIndex = this.currentCameraIndex + step;
        this.currentCameraIndex = currentCameraIndex;
        this.eventCallbacks[BufferEvent.CHANGE_CAMERA].forEach(function (callbackFunc) {
            callbackFunc();
        });
        console.info("Change camera to " + this.currentCameraIndex);
        // Freeze Meta | Start change camera
        if (this.freezeMeta === undefined) {
            // Mark player paused state
            var isPlayerPaused = this.player.isPaused();
            if (isPlayerPaused)
                this.player.pause();
            this.player.mute();
            // Set freeze meta
            var currentTime = this.player.getCurrentTime();
            var playSegmentIndex = BufferManager.getSegmentIndexByTime(currentTime);
            this.freezeMeta = {
                time: currentTime,
                segmentIndex: playSegmentIndex,
                isPaused: isPlayerPaused
            };
            console.debug(this.freezeMeta);
        }
        if (this.releaseFreezeMetaTimer !== undefined) {
            clearTimeout(this.releaseFreezeMetaTimer);
        }
        this.releaseFreezeMetaTimer = setTimeout(function () { return _this.clearFreezeMeta(); }, setting_1.default.freezeTimeDelay * 1000);
        this.addTask(BufferTaskType.APPEND, {
            cameraIndex: currentCameraIndex,
            segmentIndex: this.freezeMeta.segmentIndex - 1
        });
        this.addTask(BufferTaskType.CHANGE, {
            cameraIndex: currentCameraIndex,
            segmentIndex: this.freezeMeta.segmentIndex
        });
        this.addTask(BufferTaskType.APPEND, {
            cameraIndex: currentCameraIndex,
            segmentIndex: this.freezeMeta.segmentIndex + 1
        });
    };
    BufferManager.prototype.on = function (bufferEvent, callback) {
        var callbacks = this.eventCallbacks[bufferEvent];
        if (!callbacks.includes(callback)) {
            this.eventCallbacks[bufferEvent].push(callback);
        }
    };
    return BufferManager;
}());
exports.BufferManager = BufferManager;
//# sourceMappingURL=bufferManager.js.map