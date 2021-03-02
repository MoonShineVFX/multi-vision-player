interface GlobalSetting {
    mimeCodec: string;
    playerHTMLElementID: string;
    controllerHTMLElementID: string;
    bufferPreCacheLength: number;
    cameraCount: number;
    segmentPerSecond: number;
    freezeTimeDelay: number;
    minimumCameraChangeInterval: number;
}

const setting: GlobalSetting = {
    mimeCodec: 'video/mp4; codecs="avc1.7A0028"',
    playerHTMLElementID: 'the-player',
    controllerHTMLElementID: 'the-controller',
    bufferPreCacheLength: 5,
    cameraCount: 24,
    segmentPerSecond: 1,
    freezeTimeDelay: 0.07,
    minimumCameraChangeInterval: 0.03
}

export default setting;
