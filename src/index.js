
import Flv from './Flv';

const localUrl = '/videos/sample.flv';
const url = 'https://liveal.quanmin.tv/live/2080227196.flv';
const videoDom = document.getElementById('video');

const flv = new Flv(videoDom);


flv.load(url);



