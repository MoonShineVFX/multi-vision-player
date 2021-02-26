interface GlobalSetting {
    mimeCodec: string;
    playerHTMLElementID: string;
    bufferPreCacheLength: number;
    cameraCount: number;
    segmentPerSecond: number;
}

const setting: GlobalSetting = {
    mimeCodec: 'video/mp4; codecs="avc1.7A0028"',
    playerHTMLElementID: 'the-player',
    bufferPreCacheLength: 5,
    cameraCount: 24,
    segmentPerSecond: 10
}

export default setting;
