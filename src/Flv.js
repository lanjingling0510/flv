import EventEmitter from './utils/EventEmitter';
import MSEController from './core/MSEController';
import FetchLoader from './core/FetchLoader';
import Transmuxer from './core/Transmuxer';
import defaultConfig from './config';

class Flv extends EventEmitter {
  constructor(videodom, config) {
    super();
    this.tag = 'flv-player';
    this.video = videodom;
    this.config = Object.assign({}, defaultConfig, config);

    this.transmuxer = new Transmuxer(this.config);
    this.fetchLoader = new FetchLoader();
    this.mseController = new MSEController(this.video, this.config);

    this._bindEvent();
    this._bindMseEvent();
  }

  load(src) {
    this.fetchLoader.open(src);
  }

  _bindEvent() {
    const mse = this.mseController;

    this.fetchLoader.on('dataArrival', (data) => {
      this.transmuxer.appendBuffer(data.chunk);
    });

    this.transmuxer.on('initSegment', segment => {
      mse.appendInitSegment(segment);
    });

    this.transmuxer.on('mediaSegment', segment => {
      this.emit('mediaSegment', segment);
      mse.appendMediaSegment(segment);
    });

    this.transmuxer.on('mediaInfo', mediaInfo => {
      mse.init(mediaInfo);
      this.video.src = URL.createObjectURL(mse.mediaSource);
    });
  }

  _bindMseEvent() {
    const mse = this.mseController;
    mse.on('error', () => {
      this.fetchLoader.pause();
    });
  }

}

export default Flv;
