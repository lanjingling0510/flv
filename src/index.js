import FetchLoader from './FetchLoader';
import DemuxController from './DemuxController';

const localUrl = '/videos/sample.flv';

const fetchLoader = new FetchLoader(localUrl);
const demuxController = new DemuxController();

fetchLoader.open();
let i = 0;
fetchLoader.on('dataArrival', (data) => {
  if (i >= 3) {
    return;
  }
  i++;
  demuxController.decode(data.chunk);
});

demuxController.on('audioMeta', meta => {
  console.log(meta);
});

demuxController.on('videoMeta', meta => {
  console.log(meta);
});

demuxController.on('mediaInfo', mediaInfo => {
  // console.log(mediaInfo);
});

demuxController.on('availableData', (audio, video) => {
  console.log(audio, video);
});



