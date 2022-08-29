"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bufferManager_1 = require("./bufferManager");
var controller_1 = require("./controller");
var setting_1 = require("./setting");
var MultiVisionPlayer = /** @class */ (function () {
    function MultiVisionPlayer(playerElement, customDataName, customMetadata, disableDefaultControl, onMetadataLoaded, onError) {
        var _this = this;
        console.info('Initialize MultiVisionPlayer');
        this.playerElement = playerElement || null;
        this.messageElement = null;
        this.fullScreenElement = null;
        this.mediaSource = undefined;
        this.bufferManager = undefined;
        this.controller = undefined;
        this.muteVolume = 1.0;
        this.changeCameraStepsQueue = [];
        this.isCameraChanging = false;
        this.isBufferCompleted = false;
        this.isManualSetTime = false;
        this.onError = onError;
        this.fetchMetadata(customDataName, customMetadata, onMetadataLoaded).then(function () {
            if (!_this.playerElement)
                _this.playerElement = document.getElementById(setting_1.default.playerHTMLElementID);
            _this.messageElement = document.getElementById(setting_1.default.messageElementID);
            _this.fullScreenElement = document.getElementById(setting_1.default.fullScreenID);
            if (_this.fullScreenElement) {
                _this.fullScreenElement.addEventListener('pointerdown', function () {
                    var mainElement = document.getElementById('main');
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                        _this.fullScreenElement.style.opacity = '0.8';
                    }
                    else {
                        mainElement.requestFullscreen();
                        _this.fullScreenElement.style.opacity = '0.3';
                    }
                });
            }
        }).then(function () { return _this.initializeMediaSource(); }).then(function () {
            _this.mediaSource.duration = setting_1.default.sourceDuration;
            if (setting_1.default.liveStreaming) {
                _this.setCurrentTime(bufferManager_1.BufferManager.getTimeBySegmentIndex(setting_1.default.initialSegmentNumber));
            }
            var videoBuffer = _this.mediaSource.addSourceBuffer(setting_1.default.videoMimeCodec);
            var audioBuffer = null;
            if (setting_1.default.audioMimeCodec !== '') {
                audioBuffer = _this.mediaSource.addSourceBuffer(setting_1.default.audioMimeCodec);
            }
            _this.bufferManager = new bufferManager_1.BufferManager(videoBuffer, audioBuffer, _this);
            _this.playerElement.style.display = 'block';
            if (!disableDefaultControl)
                _this.controller = new controller_1.default(_this);
            _this.playerElement.addEventListener('seeking', function () {
                _this.playerElement.controls = false;
                if (_this.isManualSetTime) {
                    _this.isManualSetTime = false;
                    return;
                }
                _this.bufferManager.resetOnTime(_this.getCurrentTime());
            });
            _this.playerElement.addEventListener('seeked', function () {
                if (_this.controller)
                    _this.playerElement.controls = true;
            });
            _this.bufferManager.on(bufferManager_1.BufferEvent.COMPLETE, function () {
                // When buffer completed, close stream
                if (_this.mediaSource.readyState === 'open') {
                    console.info('Complete play!');
                    _this.mediaSource.endOfStream();
                    _this.isBufferCompleted = true;
                }
            });
        }).catch(function (message) { return _this.showError(message); });
    }
    MultiVisionPlayer.prototype.fetchMetadata = function (customDataName, customMetadata, onMetadataLoaded) {
        return __awaiter(this, void 0, void 0, function () {
            var dataName, isResolve, errorMessage, metadata, resp, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        dataName = customDataName || location.pathname.substr(1);
                        isResolve = false;
                        errorMessage = '';
                        // Apply custom metadata
                        if (customMetadata)
                            setting_1.default.applyMetadata(undefined, customMetadata);
                        // Auto streamHost when in stream mode
                        if (setting_1.default.streamHost === '') {
                            setting_1.default.streamHost = "http://" + location.hostname + ":8081";
                        }
                        if (!!dataName) return [3 /*break*/, 1];
                        errorMessage = 'Please input data name!';
                        return [3 /*break*/, 7];
                    case 1:
                        metadata = void 0;
                        return [4 /*yield*/, fetch(setting_1.default.streamHost + "/" + dataName + "/metadata.json")];
                    case 2:
                        resp = _b.sent();
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, resp.json()];
                    case 4:
                        metadata = _b.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        _a = _b.sent();
                        throw new Error("No data name \"" + dataName + "\" found!");
                    case 6:
                        setting_1.default.applyMetadata(dataName, metadata);
                        if (onMetadataLoaded)
                            onMetadataLoaded(setting_1.default);
                        isResolve = true;
                        _b.label = 7;
                    case 7: return [2 /*return*/, new Promise(function (resolve) {
                            if (isResolve) {
                                resolve(errorMessage);
                            }
                            else {
                                throw new Error(errorMessage);
                            }
                        })];
                }
            });
        });
    };
    MultiVisionPlayer.prototype.initializeMediaSource = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.mediaSource = new MediaSource();
            _this.mediaSource.addEventListener('sourceopen', resolve);
            _this.playerElement.src = URL.createObjectURL(_this.mediaSource);
        });
    };
    MultiVisionPlayer.prototype.showError = function (message) {
        console.warn(message);
        if (this.playerElement)
            this.playerElement.style.display = 'none';
        if (this.messageElement) {
            this.messageElement.innerHTML = message;
            this.messageElement.style.display = 'block';
        }
        if (this.onError)
            this.onError(message);
    };
    MultiVisionPlayer.prototype.getCurrentTime = function () {
        return this.playerElement.currentTime;
    };
    MultiVisionPlayer.prototype.setCurrentTime = function (time) {
        this.isManualSetTime = true;
        this.playerElement.currentTime = time;
    };
    MultiVisionPlayer.prototype.addEventListener = function (type, listener) {
        this.playerElement.addEventListener(type, listener);
    };
    MultiVisionPlayer.prototype.play = function () {
        this.playerElement.play().catch(function (reason) { return console.error(reason); });
    };
    MultiVisionPlayer.prototype.pause = function () {
        this.playerElement.pause();
    };
    MultiVisionPlayer.prototype.isPaused = function () {
        return this.playerElement.paused;
    };
    MultiVisionPlayer.prototype.mute = function () {
        this.muteVolume = this.playerElement.volume;
        this.playerElement.volume = 0;
    };
    MultiVisionPlayer.prototype.unMute = function () {
        this.playerElement.volume = this.muteVolume;
    };
    MultiVisionPlayer.prototype.requestChangeCamera = function (step) {
        this.changeCameraStepsQueue.push(step);
        if (!this.isCameraChanging) {
            this.isCameraChanging = true;
            this.updateChangeCamera();
        }
    };
    MultiVisionPlayer.prototype.requestChangeCameraByIndex = function (index) {
        var step = index - this.bufferManager.currentCameraIndex;
        this.requestChangeCamera(step);
    };
    MultiVisionPlayer.prototype.updateChangeCamera = function () {
        var _this = this;
        console.debug('Update change camera');
        if (this.changeCameraStepsQueue.length === 0) {
            this.isCameraChanging = false;
            console.debug('Finish change camera');
            if (this.isBufferCompleted) {
                try {
                    this.mediaSource.endOfStream();
                }
                catch (e) {
                    console.warn("EndStreamError: " + e);
                }
            }
            return;
        }
        this.bufferManager.changeCamera(this.changeCameraStepsQueue.shift());
        setTimeout(function () { return _this.updateChangeCamera(); }, setting_1.default.minimumCameraChangeInterval * 1000);
    };
    return MultiVisionPlayer;
}());
exports.default = MultiVisionPlayer;
//# sourceMappingURL=player.js.map