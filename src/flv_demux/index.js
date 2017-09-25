import EventEmitter from '../utils/EventEmitter';
import Header from './Header';
import Body from './Body';


class FlvDemux extends EventEmitter {
  constructor() {
    super();
    this._buffer = null;
    this._header = new Header();
    this._body = new Body();

    this.header.on('header', this.headerDataHandler.bind(this));
    this.body.on('tag', this.tagDataHandler.bind(this));
  }

  decode(buffer, size = 0) {

  }


  headerDataHandler(data) {
    this.emit('header', data);
  }

  tagDataHandler(data) {
    this.emit('tag', data);
  }
}

export default FlvDemux;
