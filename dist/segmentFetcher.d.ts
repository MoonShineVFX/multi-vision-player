export interface SegmentCacheMeta {
    cameraIndex: number;
    segmentIndex: number;
}
declare type FetchCallback = (cameraIndex: number | string, segmentIndex: number, arrayBuffer: ArrayBuffer) => void;
export declare class SegmentFetcher {
    private fetchCallback;
    private hasAudio;
    currentIndex: number;
    isFetching: boolean;
    constructor(fetchCallback: FetchCallback, hasAudio: boolean);
    fetchSegment(currentCameraIndex: number): Promise<SegmentCacheMeta>;
}
export {};
