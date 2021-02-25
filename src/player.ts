class MultiVisionPlayer {
  private mimeCodec: string;
  private HTMLElement: HTMLMediaElement;
  private mediaSource?: MediaSource;
  private sourceBuffer?: SourceBuffer;
  private currentFrameIndex: number;
  private currentCamIndex: number;

  constructor(mimeCodec: string, htmlElement: HTMLMediaElement) {
    this.mimeCodec = mimeCodec;
    this.HTMLElement = htmlElement;
    this.mediaSource = undefined;
    this.sourceBuffer = undefined;

    this.currentFrameIndex = 0;
    this.currentCamIndex = 1;

    this.initializeMediaSource()
      .then(() => this.initializeSourceBuffer())
      .then(() => this.onSourceUpdateEnd());
  }

  private static log(text: string) {
    console.debug('[MVP] ' + text);
  }

  private initializeMediaSource(): Promise<Event> {
    MultiVisionPlayer.log('Initialize Media Source')
    return new Promise<Event>(resolve => {
      this.mediaSource = new MediaSource();
      this.HTMLElement.src = URL.createObjectURL(this.mediaSource);
      this.mediaSource.addEventListener('sourceopen', resolve);
    });
  }

  private initializeSourceBuffer(): Promise<Event> {
    MultiVisionPlayer.log('Initialize Source Buffer')
    return new Promise<Event>(resolve => {
      this.sourceBuffer = this.mediaSource!.addSourceBuffer(this.mimeCodec);
      // on buffer update
      this.sourceBuffer.addEventListener('updateend', resolve);
    });
  }

  private onSourceUpdateEnd() {
    MultiVisionPlayer.log('Update end');
  }

  private fetchSegment = () => {
    let segmentUrl: string;
    if (this.currentFrameIndex === 0) {
      segmentUrl = `${this.currentCamIndex}/index.mp4`;
    }else {
      segmentUrl = `${this.currentCamIndex}/${this.currentFrameIndex}.m4s`;
    }

    fetch(segmentUrl).then(
      resp => resp.arrayBuffer()
    ).then(buffer => {
      this.currentFrameIndex += 1
      this.sourceBuffer!.appendBuffer(buffer);
    })
  }

}

export default MultiVisionPlayer;