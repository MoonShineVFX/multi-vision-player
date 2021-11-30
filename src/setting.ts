interface GlobalSetting {
    videoMimeCodec: string;
    audioMimeCodec: string;
    playerHTMLElementID: string;
    controllerHTMLElementID: string;
    bufferPreCacheLength: number;
    cameraCount: number;
    segmentPerSecond: number;
    freezeTimeDelay: number;
    minimumCameraChangeInterval: number;
    endSegment: number;
    streamHost: string;
    sourceDuration: number;
    cachePurgeInterval: number;
    purgePreservedLength: number;
}

const setting: GlobalSetting = {
    videoMimeCodec: 'video/mp4; codecs="avc1.7A0028"',
    audioMimeCodec: 'audio/mp4; codecs="mp4a.40.2"',
    playerHTMLElementID: 'the-player',
    controllerHTMLElementID: 'the-controller',
    bufferPreCacheLength: 5,
    cameraCount: 16,
    segmentPerSecond: 1,
    freezeTimeDelay: 0.07,
    minimumCameraChangeInterval: 0.03,
    endSegment: 60,
    streamHost: 'http://127.0.0.1:8081',
    sourceDuration: 60,
    cachePurgeInterval: 5,
    purgePreservedLength: 2
}

export default setting;
