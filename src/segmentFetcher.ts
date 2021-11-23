// Define
interface SegmentFetchMeta {
    cameraIndex: number;
    segmentIndex: number;
}
type FetchCallback = (cameraIndex: string, segmentIndex: number, arrayBuffer: ArrayBuffer) => void;

function pad(num: number | string, size: number) {
    let numStr = num.toString();
    while (numStr.length < size) numStr = "0" + numStr;
    return numStr;
}


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
        console.debug(`Fetch with camera ${currentCameraIndex}`)
        this.isFetching = true;

        // Define segment filename
        console.debug(`Define segment`)
        let segmentName: string;
        if (this.currentIndex === 0) {
            segmentName = '/init.m4s';
        }else {
            segmentName = `/${pad(this.currentIndex, 4)}.m4s`;
        }
        console.debug(`Fetch file ${segmentName}`)

        // Batch fetch for multiple cameras
        let fetchPromises: [Promise<void>?] = [];
        this.cameraIndexList.forEach((cameraIndex) => {
            console.debug(`Fetch for camera ${cameraIndex}`)
            let requestURL = `${pad(cameraIndex, 2)}${segmentName}`;
            if (cameraIndex === 'audio') requestURL = requestURL.replace('m4s', 'webm');
            const fetchPromise = fetch(
                requestURL
            ).then(resp => {
                console.debug('Get arraybuffer');
                return resp.arrayBuffer();
            }).then(arrayBuffer => {
                console.debug('Store to cache');
                this.fetchCallback(cameraIndex, this.currentIndex, arrayBuffer);
            })
            fetchPromises.push(fetchPromise);
        })

        // Gather fetches and apply buffer
        return Promise.all(fetchPromises)
            .then(() => {
                console.debug('All fetch finished')
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
