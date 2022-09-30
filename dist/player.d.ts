import { BufferManager } from "./bufferManager";
import { GlobalSetting } from './setting';
declare class MultiVisionPlayer {
    private playerElement;
    private messageElement;
    private fullScreenElement;
    private mediaSource?;
    bufferManager?: BufferManager;
    private controller?;
    private changeCameraStepsQueue;
    private muteVolume;
    private isCameraChanging;
    private isBufferCompleted;
    private isManualSetTime;
    private onError?;
    constructor(playerElement?: HTMLVideoElement, customDataName?: string, customMetadata?: Object, disableDefaultControl?: boolean, onMetadataLoaded?: (metadata: GlobalSetting) => void, onError?: (errorMessage: string) => void);
    private fetchMetadata;
    private initializeMediaSource;
    private handleVideoEvent;
    private showError;
    getCurrentTime(): number;
    setCurrentTime(time: number): void;
    addEventListener(type: string, listener: () => any): void;
    play(): void;
    pause(): void;
    isPaused(): boolean;
    mute(): void;
    unMute(): void;
    requestChangeCamera(step: number): void;
    requestChangeCameraByIndex(index: number): void;
    updateChangeCamera(): void;
}
export default MultiVisionPlayer;
