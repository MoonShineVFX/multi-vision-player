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
        console.info('Initialize SegmentFetcher')
        this.cameraIndexList = cameraIndexList;
        this.fetchCallback = fetchCallback;
        this.isFetching = false;
        this.currentIndex = 0;
    }

    async fetchSegment(currentCameraIndex: number): Promise<SegmentFetchMeta> {
        this.isFetching = true;

        // Define segment filename
        let segmentName: string;
        if (this.currentIndex === 0) {
            segmentName = '/init.m4s';
        }else {
            segmentName = `/${pad(this.currentIndex, 4)}.m4s`;
        }
        console.debug(`Fetch segment : camera ${currentCameraIndex} / ${segmentName}`)

        // Batch fetch for multiple cameras
        let fetchPromises: [Promise<void>?] = [];
        for (const cameraIndex of this.cameraIndexList) {
            let requestURL = `${pad(cameraIndex, 2)}${segmentName}`;
            if (cameraIndex === 'audio') {
                requestURL = requestURL.replace('m4s', 'webm');
            }

            const response = await fetch(requestURL);
            const result = response.arrayBuffer().then(
                buffer => this.fetchCallback(cameraIndex, this.currentIndex, buffer)
            );

            fetchPromises.push(result);
        }

        // Gather fetches and apply buffer
        await Promise.all(fetchPromises)
        console.debug('Segment fetch finished')
        this.isFetching = false;
        const segmentIndex = this.currentIndex;
        this.currentIndex += 1;
        return {
            cameraIndex: currentCameraIndex,
            segmentIndex: segmentIndex
        }
    }
}

export { SegmentFetcher, SegmentFetchMeta };
