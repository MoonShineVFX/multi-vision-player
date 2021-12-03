interface GlobalSetting {
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
    sourceDuration: number;
    cachePurgeInterval: number;
    purgePreservedLength: number;
    resumeSegmentIndexOffset: number;
    changeDirection: number;
    slideSensitive: number;
}

const setting: GlobalSetting = {
    // define
    streamHost: 'http://127.0.0.1:8081',
    videoMimeCodec: 'video/mp4; codecs="avc1.7A0028"',
    audioMimeCodec: 'audio/mp4; codecs="mp4a.40.2"',
    playerHTMLElementID: 'the-player',
    controllerHTMLElementID: 'the-controller',
    cameraDotStyleDefault: 'camera',
    cameraDotStyleSelect: 'camera select',
    // basic
    cameraCount: 16,
    segmentsPerSecond: 10,
    endSegment: 5651,
    sourceDuration: 565,
    // cache
    bufferPreCacheLength: 5,
    cachePurgeInterval: 5,
    purgePreservedLength: 2,
    // control camera changing
    freezeTimeDelay: 0.07,
    minimumCameraChangeInterval: 0.03,
    resumeSegmentIndexOffset: -1,  // -1 if 0.1
    changeDirection: 1,
    slideSensitive: 1.5
}

export default setting;
