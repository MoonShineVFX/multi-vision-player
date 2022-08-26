"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalSetting = void 0;
var GlobalSetting = /** @class */ (function () {
    function GlobalSetting() {
        var _this = this;
        this.applyMetadata = function (dataName, metadata) {
            console.info('Apply metadata: ' + dataName);
            console.info(metadata);
            if (dataName)
                _this.streamURI = dataName;
            Object.keys(metadata).forEach(function (key) {
                _this[key] = metadata[key];
            });
        };
        // Define
        this.mainElementID = 'main';
        this.messageElementID = 'message';
        this.playerHTMLElementID = 'the-player';
        this.fullScreenID = 'full-screen-button';
        this.controllerHTMLElementID = 'the-controller';
        this.cameraDotStyleDefault = 'camera';
        this.cameraDotStyleSelect = 'camera select';
        // Metadata
        this.streamHost = process.env.STREAM_HOST || '';
        this.liveStreaming = false;
        this.streamURI = 'data';
        this.videoMimeCodec = 'video/mp4; codecs="avc1.7A0028"';
        this.audioMimeCodec = 'audio/mp4; codecs="mp4a.40.2"';
        this.cameraCount = -1; // 16
        this.segmentsPerSecond = -1; // 1
        this.endSegment = -1; // 565
        this.sourceDuration = -1; // 565
        this.resumeSegmentIndexOffset = 0; // -1 if 0.1
        this.initialSegmentNumber = 0;
        // Cache
        this.bufferPreCacheLength = 5;
        this.cachePurgeInterval = 5;
        this.purgePreservedLength = 2;
        // Control camera changing
        this.freezeTimeDelay = 0.07;
        this.minimumCameraChangeInterval = 0.03;
        this.changeDirection = 1;
        this.slideSensitive = 1.5;
    }
    GlobalSetting.getInstance = function () {
        if (!GlobalSetting.instance) {
            GlobalSetting.instance = new GlobalSetting();
        }
        return GlobalSetting.instance;
    };
    return GlobalSetting;
}());
exports.GlobalSetting = GlobalSetting;
var setting = GlobalSetting.getInstance();
exports.default = setting;
//# sourceMappingURL=setting.js.map