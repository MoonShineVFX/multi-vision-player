import { BufferManager, BufferEvent } from "./bufferManager";
import setting from "./setting";


class MultiVisionPlayer {
    private HTMLElement: HTMLMediaElement;
    private mediaSource?: MediaSource;
    private bufferManager?: BufferManager;
    private changeCameraStepsQueue: number[];
    private isCameraChanging: boolean;

    constructor() {
        console.debug('Initialize MultiVisionPlayer')
        this.HTMLElement = <HTMLMediaElement>document.getElementById(setting.playerHTMLElementID)!;
        this.mediaSource = undefined;
        this.bufferManager = undefined;
        this.changeCameraStepsQueue = [];
        this.isCameraChanging = false;

        this.initializeMediaSource()
            .then(() => {
                const sourceBuffer = this.mediaSource!.addSourceBuffer(
                    setting.mimeCodec
                );
                this.bufferManager = new BufferManager(
                    sourceBuffer,
                    this.HTMLElement
                )
                this.bufferManager.on(
                    BufferEvent.COMPLETE,
                    () => {
                        if (this.mediaSource!.readyState === 'open') {
                            console.debug('Complete fetch!')
                            this.mediaSource!.endOfStream();
                        }
                    }
                )
            })
    }

    private initializeMediaSource(): Promise<Event> {
        return new Promise<Event>(resolve => {
            this.mediaSource = new MediaSource();
            this.HTMLElement.src = URL.createObjectURL(this.mediaSource);
            this.mediaSource.addEventListener('sourceopen', resolve);
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
        console.log('change camera');
        if (this.changeCameraStepsQueue.length === 0) {
            this.isCameraChanging = false;
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