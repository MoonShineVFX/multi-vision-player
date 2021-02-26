// Define
interface SegmentFetchMeta {
    cameraIndex: number;
    segmentIndex: number;
}
type FetchCallback = (cameraIndex:string, segmentIndex:number, arrayBuffer: ArrayBuffer) => void;


// Main
class SegmentFetcher {
    isFetching: boolean;
    fetchCallback: FetchCallback;
    cameraIndexList: string[];

    constructor(cameraIndexList: string[], fetchCallback: FetchCallback) {
        this.cameraIndexList = cameraIndexList;
        this.fetchCallback = fetchCallback;
        this.isFetching = false;
    }

    fetch(currentCameraIndex: number, segmentIndex: number): Promise<SegmentFetchMeta> {
        this.isFetching = true;

        // Define segment filename
        let segmentName: string;
        if (segmentIndex === 0) {
            segmentName = '/init.mp4';
        }else {
            segmentName = `/${segmentIndex}.m4s`;
        }

        // Batch fetch for multiple cameras
        let fetchPromises: [Promise<void>?] = [];
        this.cameraIndexList.forEach((cameraIndex) => {
            const fetchPromise = fetch(`${cameraIndex}/${segmentName}`).then(
                resp => resp.arrayBuffer()
            ).then(arrayBuffer => {
                this.fetchCallback(cameraIndex, segmentIndex, arrayBuffer);
            })
            fetchPromises.push(fetchPromise);
        })

        // Gather fetches and apply buffer
        return Promise.all(fetchPromises)
            .then(() => {
                this.isFetching = false;
                return {
                    cameraIndex: currentCameraIndex,
                    segmentIndex: segmentIndex
                }
            })
    }
}

export { SegmentFetcher, SegmentFetchMeta };
