import MultiVisionPlayer from "./player";
declare enum BufferEvent {
    CHANGE_CAMERA = 0,
    COMPLETE = 1
}
declare class BufferManager {
    private videoBuffer;
    private audioBuffer;
    private player;
    private cameraBufferCache;
    private segmentFetcher;
    private taskQueue;
    private eventCallbacks;
    private freezeMeta?;
    private releaseFreezeMetaTimer?;
    currentCameraIndex: number;
    private purgeTriggerTime;
    private isBusyProcessingTask;
    private isCachingCompleted;
    private isAutoplayAfterPrecaching;
    constructor(videoBuffer: SourceBuffer, audioBuffer: SourceBuffer | null, player: MultiVisionPlayer);
    static getSegmentIndexByTime(time: number): number;
    static getTimeBySegmentIndex(index: number): number;
    private initialBufferCache;
    private processTask;
    private addTask;
    private checkFetchingNecessary;
    private clearFreezeMeta;
    resetOnTime(time: number): void;
    changeCamera(step: number): void;
    on(bufferEvent: BufferEvent, callback: () => void): void;
}
export { BufferManager, BufferEvent };
