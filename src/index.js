
import Flv from './Flv';

const localUrl = '/videos/demo.flv';
// const url = 'https://liveal.quanmin.tv/live/29189.flv';
const videoDom = document.getElementById('video');

const flv = new Flv(videoDom);

flv.load(localUrl);

