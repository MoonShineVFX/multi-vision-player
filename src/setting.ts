interface GlobalSetting {
    mimeCodec: string;
    playerHTMLElementID: string;
    controllerHTMLElementID: string;
    bufferPreCacheLength: number;
    cameraCount: number;
    segmentPerSecond: number;
    freezeTimeDelay: number;
}

const setting: GlobalSetting = {
    mimeCodec: 'video/mp4; codecs="avc1.7A0028"',
    playerHTMLElementID: 'the-player',
    controllerHTMLElementID: 'the-controller',
    bufferPreCacheLength: 5,
    cameraCount: 24,
    segmentPerSecond: 10,
    freezeTimeDelay: 0.07
}

export default setting;
