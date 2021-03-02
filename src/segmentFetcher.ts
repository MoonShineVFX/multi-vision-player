// Define
interface SegmentFetchMeta {
    cameraIndex: number;
    segmentIndex: number;
}
type FetchCallback = (cameraIndex:string, segmentIndex:number, arrayBuffer: ArrayBuffer) => void;


// Main
class SegmentFetcher {
    private fetchCallback: FetchCallback;
    private cameraIndexList: string[];
    currentIndex: number;
    isFetching: boolean;

    constructor(cameraIndexList: string[], fetchCallback: FetchCallback) {
        this.cameraIndexList = cameraIndexList;
        this.fetchCallback = fetchCallback;
        this.isFetching = false;
        this.currentIndex = 0;
    }

    fetch(currentCameraIndex: number): Promise<SegmentFetchMeta> {
        this.isFetching = true;

        // Define segment filename
        let segmentName: string;
        if (this.currentIndex === 0) {
            segmentName = '/init.mp4';
        }else {
            segmentName = `/${this.currentIndex}.m4s`;
        }

        // Batch fetch for multiple cameras
        let fetchPromises: [Promise<void>?] = [];
        this.cameraIndexList.forEach((cameraIndex) => {
            const fetchPromise = fetch(`${cameraIndex}/${segmentName}`).then(
                resp => resp.arrayBuffer()
            ).then(arrayBuffer => {
                this.fetchCallback(cameraIndex, this.currentIndex, arrayBuffer);
            })
            fetchPromises.push(fetchPromise);
        })

        // Gather fetches and apply buffer
        return Promise.all(fetchPromises)
            .then(() => {
                this.isFetching = false;
                const segmentIndex = this.currentIndex;
                this.currentIndex += 1;
                return {
                    cameraIndex: currentCameraIndex,
                    segmentIndex: segmentIndex
                }
            })
    }
}

export { SegmentFetcher, SegmentFetchMeta };
