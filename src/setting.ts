class GlobalSetting {
    private static instance: GlobalSetting;
    videoMimeCodec: string;
    audioMimeCodec: string;
    playerHTMLElementID: string;
    controllerHTMLElementID: string;
    cameraDotStyleDefault: string;
    cameraDotStyleSelect: string;
    bufferPreCacheLength: number;
    cameraCount: number;
    segmentsPerSecond: number;
    freezeTimeDelay: number;
    minimumCameraChangeInterval: number;
    endSegment: number;
    streamHost: string;
    streamURI: string;
    sourceDuration: number;
    cachePurgeInterval: number;
    purgePreservedLength: number;
    resumeSegmentIndexOffset: number;
    changeDirection: number;
    slideSensitive: number;

    constructor() {
        // Define
        this.playerHTMLElementID = 'the-player'
        this.controllerHTMLElementID = 'the-controller'
        this.cameraDotStyleDefault = 'camera'
        this.cameraDotStyleSelect = 'camera select'
        // Metadata
        this.streamHost = process.env.STREAM_HOST || ''
        this.streamURI = 'data'
        this.videoMimeCodec = 'video/mp4; codecs="avc1.7A0028"'
        this.audioMimeCodec = 'audio/mp4; codecs="mp4a.40.2"'
        this.cameraCount = -1  // 16
        this.segmentsPerSecond = -1  // 1
        this.endSegment = -1  // 565
        this.sourceDuration = -1  // 565
        this.resumeSegmentIndexOffset = 0  // -1 if 0.1
        // Cache
        this.bufferPreCacheLength = 5
        this.cachePurgeInterval = 5
        this.purgePreservedLength = 2
        // Control camera changing
        this.freezeTimeDelay = 0.07
        this.minimumCameraChangeInterval = 0.03
        this.changeDirection = 1
        this.slideSensitive = 1.5
    }

    static getInstance(): GlobalSetting {
        if (!GlobalSetting.instance) {
            GlobalSetting.instance = new GlobalSetting();
        }
        return GlobalSetting.instance;
    }

    applyMetadata = (dataName: string, metadata: Object) => {
        console.info('Apply metadata: ' + dataName);
        console.info(metadata);
        this.streamURI = dataName;
        Object.keys(metadata).forEach(key => {
            (this as any)[key] = (metadata as any)[key];
        });
    }
}


const setting = GlobalSetting.getInstance();


export default setting;
