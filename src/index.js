
import Flv from './Flv';
import Transmuxer from './core/Transmuxer';

const localUrl = '/videos/sample.flv';
// const url = 'https://liveal.quanmin.tv/live/29189.flv';
const videoDom = document.getElementById('video');

const flv = new Flv(videoDom);
flv.load(localUrl);



