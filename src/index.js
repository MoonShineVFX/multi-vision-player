import './index.less'

const mimeCodec = 'video/mp4; codecs="avc1.7A0028"';
const playerElement = document.getElementById('the-player');
playerElement.addEventListener('stalled', e => console.log(e));
playerElement.addEventListener('waiting', e => console.log(e));

let sourceBuffer;
const mediaSource = new MediaSource();
playerElement.src = URL.createObjectURL(mediaSource);
mediaSource.addEventListener('sourceopen', sourceOpen);

let camIndex = 1;
let frameIndex = 'init';
let step = 1;

function sourceOpen() {
  const mediaSource = this;
  mediaSource.duration = 6;

  sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);
  sourceBuffer.addEventListener('updateend', function(_) {
    if (frameIndex === 120) {
      mediaSource.endOfStream();
    } else {
      fetchBuffer();
    }
  })

  fetchBuffer('init');
}

function fetchBuffer() {
  let url;
  if (frameIndex === 'init') {
    url = `${camIndex}/${frameIndex}.mp4`;
    frameIndex = 1
  }else {
    url = `${camIndex}/${frameIndex}.m4s`;
    frameIndex += 1
  }

  camIndex += step;
  if (camIndex > 24) {
    camIndex = 23;
    step = -1;
  }else if (camIndex < 1) {
    camIndex = 2;
    step = 1;
  }

  fetch(url).then(
    resp => resp.arrayBuffer()
  ).then(buffer => {
    sourceBuffer.appendBuffer(buffer);
  })
}

