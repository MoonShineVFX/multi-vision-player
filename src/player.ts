import { BufferManager, BufferEvent } from "./bufferManager";
import Controller from "./controller";
import setting from "./setting";


class MultiVisionPlayer {
    private playerElement: HTMLMediaElement;
    private messageElement: HTMLDivElement;
    private mediaSource?: MediaSource;
    public bufferManager?: BufferManager;
    private controller?: Controller;

    private changeCameraStepsQueue: number[];
    private muteVolume: number;

    private isCameraChanging: boolean;
    private isBufferCompleted: boolean;
    private isManualSetTime: boolean;

    constructor() {
        console.info('Initialize MultiVisionPlayer')
        this.playerElement = <HTMLMediaElement>document.getElementById(setting.playerHTMLElementID)!;
        this.messageElement = <HTMLDivElement>document.getElementById(setting.messageElementID)!;
        this.mediaSource = undefined;
        this.bufferManager = undefined;
        this.controller = undefined;
        this.muteVolume = 1.0;
        this.changeCameraStepsQueue = [];
        this.isCameraChanging = false;
        this.isBufferCompleted = false;
        this.isManualSetTime = false;

        this.fetchMetadata(
        ).then(() => this.initializeMediaSource()
        ).then(() => {
            this.mediaSource!.duration = setting.sourceDuration;
            if (setting.liveStreaming) {
                this.setCurrentTime(BufferManager.getTimeBySegmentIndex(setting.initialSegmentNumber));
            }

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
            this.playerElement.style.display = 'block';
            this.controller = new Controller(this);
            this.playerElement.addEventListener('seeking', () => {
                if (this.isManualSetTime) {
                    this.isManualSetTime = false;
                    return;
                }
                this.bufferManager!.resetOnTime(this.getCurrentTime());
            });
            this.bufferManager.on(
                BufferEvent.COMPLETE,
                () => {
                    // When buffer completed, close stream
                    if (this.mediaSource!.readyState === 'open') {
                        console.info('Complete play!')
                        this.mediaSource!.endOfStream();
                        this.isBufferCompleted = true;
                    }
                }
            );
        }).catch(message => this.showError(message))
    }

    private async fetchMetadata(): Promise<any> {
        const dataName = location.pathname.substr(1);
        let isResolve = false;
        let errorMessage = '';
        if (!dataName) {
            errorMessage = 'Please input data name!';
        } else {
            const resp = await fetch(`${setting.streamHost}/${dataName}/metadata.json`);
            let metadata: Object;
            try {
                metadata = await resp.json();
            } catch {
                throw new Error(`No data name "${dataName}" found!`)
            }
            setting.applyMetadata(dataName, metadata);
            isResolve = true;
        }

        return new Promise<any>(resolve => {
            if (isResolve) {
                resolve(errorMessage);
            } else {
                throw new Error(errorMessage);
            }
        });
    }

    private initializeMediaSource(): Promise<Event> {
        return new Promise<Event>(resolve => {
            this.mediaSource = new MediaSource();
            this.mediaSource.addEventListener('sourceopen', resolve);
            this.playerElement.src = URL.createObjectURL(this.mediaSource);
        });
    }

    private showError(message: string) {
        console.warn(message);
        this.playerElement.style.display = 'none';
        this.messageElement.innerHTML = message;
        this.messageElement.style.display = 'block';
    }

    getCurrentTime(): number {
        return this.playerElement.currentTime;
    }

    setCurrentTime(time: number) {
        this.isManualSetTime = true;
        this.playerElement.currentTime = time;
    }

    addEventListener(type: string, listener: () => any) {
        this.playerElement.addEventListener(type, listener);
    }

    play() {
        this.playerElement.play().catch(
            reason => console.error(reason)
        );
    }

    pause() {
        this.playerElement.pause();
    }

    isPaused() {
        return this.playerElement.paused;
    }

    mute() {
        this.muteVolume = this.playerElement.volume;
        this.playerElement.volume = 0;
    }

    unMute() {
        this.playerElement.volume = this.muteVolume;
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
            if (this.isBufferCompleted) {
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