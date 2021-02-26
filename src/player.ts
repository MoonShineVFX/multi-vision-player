import { BufferManager, BufferEvent } from "./bufferManager";
import setting from "./setting";


class MultiVisionPlayer {
    private HTMLElement: HTMLMediaElement;
    private mediaSource?: MediaSource;
    private bufferManager?: BufferManager;

    constructor() {
        console.debug('Initialize MultiVisionPlayer')
        this.HTMLElement = <HTMLMediaElement>document.getElementById(setting.playerHTMLElementID)!;
        this.mediaSource = undefined;
        this.bufferManager = undefined;

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

    changeCamera(step: number) {
        this.bufferManager!.changeCamera(step);
    }
}

export default MultiVisionPlayer;