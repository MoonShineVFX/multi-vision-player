import { BufferManager, BufferEvent } from "./bufferManager";
import Controller from "./controller";
import setting from "./setting";
import {GlobalSetting} from './setting';


class MultiVisionPlayer {
  private playerElement: HTMLMediaElement | null;
  private messageElement: HTMLDivElement | null;
  private fullScreenElement: HTMLDivElement | null;

  private mediaSource?: MediaSource;
  public bufferManager?: BufferManager;
  private controller?: Controller;

  private changeCameraStepsQueue: number[];
  private muteVolume: number;

  private isCameraChanging: boolean;
  private isBufferCompleted: boolean;
  private isManualSetTime: boolean;

  constructor(
    playerElement: HTMLVideoElement | undefined = undefined,
    customDataName: string | undefined = undefined,
    customMetadata: Object | undefined = undefined,
    disableDefaultControl: boolean = false,
    onMetadataLoaded: (metadata: GlobalSetting) => void | undefined
  ) {
    console.info('Initialize MultiVisionPlayer')
    this.playerElement = playerElement || null;
    this.messageElement = null;
    this.fullScreenElement = null;
    this.mediaSource = undefined;
    this.bufferManager = undefined;
    this.controller = undefined;
    this.muteVolume = 1.0;
    this.changeCameraStepsQueue = [];
    this.isCameraChanging = false;
    this.isBufferCompleted = false;
    this.isManualSetTime = false;

    this.fetchMetadata(
      customDataName, customMetadata, onMetadataLoaded
    ).then(() => {
      if (!this.playerElement) this.playerElement = <HTMLMediaElement>document.getElementById(setting.playerHTMLElementID);
      this.messageElement = <HTMLDivElement>document.getElementById(setting.messageElementID);
      this.fullScreenElement = <HTMLDivElement>document.getElementById(setting.fullScreenID);
      if (this.fullScreenElement) {
        this.fullScreenElement.addEventListener('pointerdown', () => {
          const mainElement = <HTMLDivElement>document.getElementById('main');
          if (document.fullscreenElement) {
            document.exitFullscreen();
            this.fullScreenElement!.style.opacity = '0.8';
          } else {
            mainElement.requestFullscreen();
            this.fullScreenElement!.style.opacity = '0.3';
          }
        })
      }
    }).then(() => this.initializeMediaSource()
    ).then(() => {
      this.mediaSource!.duration = setting.sourceDuration;
      if (setting.liveStreaming) {
        this.setCurrentTime(BufferManager.getTimeBySegmentIndex(setting.initialSegmentNumber));
      }

      const videoBuffer = this.mediaSource!.addSourceBuffer(
        setting.videoMimeCodec
      );
      let audioBuffer = null;
      if (setting.audioMimeCodec !== '') {
        audioBuffer = this.mediaSource!.addSourceBuffer(
          setting.audioMimeCodec
        )
      }
      this.bufferManager = new BufferManager(
        videoBuffer,
        audioBuffer,
        this
      )
      this.playerElement!.style.display = 'block';

      if (!disableDefaultControl) this.controller = new Controller(this);

      this.playerElement!.addEventListener('seeking', () => {
        this.playerElement!.controls = false;
        if (this.isManualSetTime) {
          this.isManualSetTime = false;
          return;
        }
        this.bufferManager!.resetOnTime(this.getCurrentTime());
      });
      this.playerElement!.addEventListener('seeked', () => {
        if (this.controller) this.playerElement!.controls = true;
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

  private async fetchMetadata(
    customDataName: string | undefined = undefined,
    customMetadata: Object | undefined = undefined,
    onMetadataLoaded: (metadata: GlobalSetting) => void | undefined
  ): Promise<any> {
    const dataName = customDataName || location.pathname.substr(1);
    let isResolve = false;
    let errorMessage = '';

    // Apply custom metadata
    if (customMetadata) setting.applyMetadata(undefined, customMetadata);

    // Auto streamHost when in stream mode
    if (setting.streamHost === '') {
      setting.streamHost = `http://${location.hostname}:8081`;
    }

    if (!dataName) {
      errorMessage = 'Please input data name!';
    } else {
      let metadata: Object;
      const resp = await fetch(`${setting.streamHost}/${dataName}/metadata.json`);
      try {
        metadata = await resp.json();
      } catch {
        throw new Error(`No data name "${dataName}" found!`)
      }

      setting.applyMetadata(dataName, metadata);
      onMetadataLoaded(setting);
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
      this.playerElement!.src = URL.createObjectURL(this.mediaSource);
    });
  }

  private showError(message: string) {
    console.warn(message);
    if (this.playerElement) this.playerElement.style.display = 'none';
    if (this.messageElement) {
      this.messageElement.innerHTML = message;
      this.messageElement.style.display = 'block';
    }
  }

  getCurrentTime(): number {
    return this.playerElement!.currentTime;
  }

  setCurrentTime(time: number) {
    this.isManualSetTime = true;
    this.playerElement!.currentTime = time;
  }

  addEventListener(type: string, listener: () => any) {
    this.playerElement!.addEventListener(type, listener);
  }

  play() {
    this.playerElement!.play().catch(
      reason => console.error(reason)
    );
  }

  pause() {
    this.playerElement!.pause();
  }

  isPaused() {
    return this.playerElement!.paused;
  }

  mute() {
    this.muteVolume = this.playerElement!.volume;
    this.playerElement!.volume = 0;
  }

  unMute() {
    this.playerElement!.volume = this.muteVolume;
  }

  requestChangeCamera(step: number) {
    this.changeCameraStepsQueue.push(step);
    if (!this.isCameraChanging) {
      this.isCameraChanging = true;
      this.updateChangeCamera();
    }
  }

  requestChangeCameraByIndex(index: number) {
    const step = index - this.bufferManager!.currentCameraIndex;
    this.requestChangeCamera(step);
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