import { BufferManager, BufferEvent } from "./bufferManager";
import setting from "./setting";


class MultiVisionPlayer {
    private HTMLElement: HTMLMediaElement;
    private mediaSource?: MediaSource;
    private bufferManager?: BufferManager;
    private changeCameraStepsQueue: number[];
    private isCameraChanging: boolean;

    constructor() {
        console.info('Initialize MultiVisionPlayer')
        this.HTMLElement = <HTMLMediaElement>document.getElementById(setting.playerHTMLElementID)!;
        this.mediaSource = undefined;
        this.bufferManager = undefined;
        this.changeCameraStepsQueue = [];
        this.isCameraChanging = false;

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
                    this.HTMLElement
                )
                this.bufferManager.on(
                    BufferEvent.COMPLETE,
                    () => {
                        if (this.mediaSource!.readyState === 'open') {
                            console.info('Complete play!')
                            this.mediaSource!.endOfStream();
                        }
                    }
                )
            })
    }

    private initializeMediaSource(): Promise<Event> {
        return new Promise<Event>(resolve => {
            this.mediaSource = new MediaSource();
            this.mediaSource.addEventListener('sourceopen', resolve);
            this.HTMLElement.src = URL.createObjectURL(this.mediaSource);
        });
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