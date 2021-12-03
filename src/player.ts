import { BufferManager, BufferEvent } from "./bufferManager";
import Controller from "./controller";
import setting from "./setting";


class MultiVisionPlayer {
    private HTMLElement: HTMLMediaElement;
    private mediaSource?: MediaSource;
    public bufferManager?: BufferManager;
    private controller?: Controller;

    private changeCameraStepsQueue: number[];
    private muteVolume: number;

    private isCameraChanging: boolean;
    private isBufferCompledetd: boolean;
    private isManualSetTime: boolean;

    constructor() {
        console.info('Initialize MultiVisionPlayer')
        this.HTMLElement = <HTMLMediaElement>document.getElementById(setting.playerHTMLElementID)!;
        this.mediaSource = undefined;
        this.bufferManager = undefined;
        this.controller = undefined;
        this.muteVolume = 1.0;
        this.changeCameraStepsQueue = [];
        this.isCameraChanging = false;
        this.isBufferCompledetd = false;
        this.isManualSetTime = false;

        this.initializeMediaSource()
            .then(() => {
                const videoBuffer = this.mediaSource!.addSourceBuffer(
                    setting.videoMimeCodec
                );
                const audioBuffer = this.mediaSource!.addSourceBuffer(
                    setting.audioMimeCodec
                )
                this.bufferManager = new BufferManager(
                    videoBuffer,
                    audioBuffer,
                    this
                )
                this.controller = new Controller(this);
                this.HTMLElement.addEventListener('seeking', () => {
                    if (this.isManualSetTime) {
                        this.isManualSetTime = false;
                        return;
                    }
                    this.bufferManager!.resetOnTime(this.getCurrentTime());
                })
                this.bufferManager.on(
                    BufferEvent.COMPLETE,
                    () => {
                        // When buffer completed, close stream
                        if (this.mediaSource!.readyState === 'open') {
                            console.info('Complete play!')
                            this.mediaSource!.endOfStream();
                            this.isBufferCompledetd = true;
                        }
                    }
                )
                this.mediaSource!.duration = setting.sourceDuration;
            })
    }

    private initializeMediaSource(): Promise<Event> {
        return new Promise<Event>(resolve => {
            this.mediaSource = new MediaSource();
            this.mediaSource.addEventListener('sourceopen', resolve);
            this.HTMLElement.src = URL.createObjectURL(this.mediaSource);
        });
    }

    getCurrentTime(): number {
        return this.HTMLElement.currentTime;
    }

    setCurrentTime(time: number) {
        this.isManualSetTime = true;
        this.HTMLElement.currentTime = time;
    }

    addEventListener(type: string, listener: () => any) {
        this.HTMLElement.addEventListener(type, listener);
    }

    play() {
        this.HTMLElement.play().catch(
            reason => console.error(reason)
        );
    }

    pause() {
        this.HTMLElement.pause();
    }

    isPaused() {
        return this.HTMLElement.paused;
    }

    mute() {
        this.muteVolume = this.HTMLElement.volume;
        this.HTMLElement.volume = 0;
    }

    unMute() {
        this.HTMLElement.volume = this.muteVolume;
    }

    requestChangeCamera(step: number) {
        this.changeCameraStepsQueue.push(step);
        if (!this.isCameraChanging) {
            this.isCameraChanging = true;
            this.updateChangeCamera();
        }
    }

    updateChangeCamera() {
        console.debug('Update change camera');
        if (this.changeCameraStepsQueue.length === 0) {
            this.isCameraChanging = false;
            console.debug('Finish change camera')
            if (this.isBufferCompledetd) {
                try {
                    this.mediaSource!.endOfStream();
                } catch (e) {
                    console.warn(`EndStreamError: ${e}`);
                }
            }
            return;
        }
        this.bufferManager!.changeCamera(
            this.changeCameraStepsQueue.shift()!
        );
        setTimeout(
            () => this.updateChangeCamera(),
            setting.minimumCameraChangeInterval * 1000
        )
    }
}

export default MultiVisionPlayer;