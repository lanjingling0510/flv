import FetchLoader from './FetchLoader';
import FlvDemux from './demux';

// const url = '/examples/sample.flv';
// const url = 'http://flv13.quanmin.tv/live/9479324_L4.flv';
const localUrl = '/videos/sample.flv';

const fetchLoader = new FetchLoader(localUrl);
const flvDemux = new FlvDemux();

fetchLoader.open();

fetchLoader.on('dataArrival', (data) => {
  flvDemux.decode(data.chunk);
});

flvDemux.on('header', (data) => {
  console.log('---------  header  ------');
  console.log(data);
});

flvDemux.on('tag', (data) => {
  console.log('---------  tag  ------');
  console.log(data);
});


