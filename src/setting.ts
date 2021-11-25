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
    endFrame: number;
    streamHost: string;
}

const setting: GlobalSetting = {
    videoMimeCodec: 'video/mp4; codecs="avc1.7A0028"',
    audioMimeCodec: 'audio/mp4; codecs="mp4a.40.2"',
    playerHTMLElementID: 'the-player',
    controllerHTMLElementID: 'the-controller',
    bufferPreCacheLength: 5,
    cameraCount: 24,
    segmentPerSecond: 10,
    freezeTimeDelay: 0.07,
    minimumCameraChangeInterval: 0.03,
    endFrame: 121,
    streamHost: 'http://127.0.0.1:8081'
}

export default setting;
