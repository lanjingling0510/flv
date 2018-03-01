
import Flv from './Flv';

const localUrl = '/videos/demo.flv';
const videoDom = document.getElementById('video');

const flv = new Flv(videoDom);

flv.load(localUrl);

