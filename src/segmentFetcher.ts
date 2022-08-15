// Define
import setting from "./setting";

export interface SegmentCacheMeta {
    cameraIndex: number;
    segmentIndex: number;
}
type FetchCallback = (cameraIndex: number | string, segmentIndex: number, arrayBuffer: ArrayBuffer) => void;


// Main
export class SegmentFetcher {
    private fetchCallback: FetchCallback;
    private hasAudio: boolean;
    currentIndex: number;
    isFetching: boolean;

    constructor(fetchCallback: FetchCallback, hasAudio: boolean) {
        console.info('Initialize SegmentFetcher')
        this.fetchCallback = fetchCallback;
        this.hasAudio = hasAudio;
        this.isFetching = false;
        this.currentIndex = 0;
    }

    async fetchSegment(currentCameraIndex: number): Promise<SegmentCacheMeta> {
        this.isFetching = true;

        // Batch fetch for multiple cameras
        let requestURL = `${setting.streamHost}/${setting.streamURI}/${this.currentIndex}`;
        const response = await fetch(requestURL);

        const buffer = await response.arrayBuffer();
        let cursor = 4 * (setting.cameraCount + (this.hasAudio ? 1 : 0));
        const size_arr = new Uint32Array(buffer.slice(0, cursor));

        // Apply cache to camera
        for (let count = 0; count < setting.cameraCount; count++){
            const size = size_arr[count];
            this.fetchCallback(
                count + 1,
                this.currentIndex,
                buffer.slice(cursor, cursor + size)
            )
            cursor += size;
        }

        // Apply cache to audio
        if (this.hasAudio) {
            this.fetchCallback(
                'audio',
                this.currentIndex,
                buffer.slice(cursor)
            )
        }

        console.debug('Segment fetch finished');
        this.isFetching = false;
        const segmentIndex = this.currentIndex;
        this.currentIndex += 1;
        return {
            cameraIndex: currentCameraIndex,
            segmentIndex: segmentIndex
        }
    }
}
