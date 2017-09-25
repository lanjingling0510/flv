import FetchLoader from './FetchLoader';


// const url = '/examples/sample.flv';
const url = 'http://58.220.18.32/flvdh.quanmin.tv/live/1874503018_L4.flv';

const fetchLoader = new FetchLoader(url);

fetchLoader.open();

// fetchLoader.on('dataArrival', function(data) {
//   console.log(data);
// });
