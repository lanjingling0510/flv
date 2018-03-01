
import Flv from './Flv';

const localUrl = '/videos/sample.flv';
const videoDom = document.getElementById('video');

const flv = new Flv(videoDom);

flv.load(localUrl);

