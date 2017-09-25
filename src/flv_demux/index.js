import EventEmitter from '../utils/EventEmitter';
import Header from './Header';
import Body from './Body';

import Buffer from '../utils/Buffer';

class FlvDemux extends EventEmitter {
  constructor() {
    super();

    this._state = Header.STATE;
    this._buffer = null;
    this._header = new Header();
    this._body = new Body();

    this._header.on('header', this.headerDataHandler.bind(this));
    this._body.on('tag', this.tagDataHandler.bind(this));
  }

  decode(buffer) {
    if (this._buffer) {
      this._buffer = Buffer.concat(this._buffer, buffer);
    } else {
      this._buffer = buffer.slice();
    }

    for (;;) {
      switch (this._state) {
        case Header.STATE: {
          if (this._buffer.byteLength < Header.MIN_LENGTH) {
            return;
          }

          let body = this._header.decode(this._buffer);
          if (!body) {
            throw new Error('not right spec header');
          }

          this.buffer = body;
          this._state = Body.STATE;
          break;
        }
        case Body.STATE: {
          if (this._buffer.byteLength < Body.MIN_LENGTH) {
            return;
          }

          let body = this._body.decode(this._buffer);
          if (!body) {
            return;
          }

          this.buffer = body;
          break;
        }
      }
    }
  }

  destroy() {
    this._buffer = null;
    this._state = Header.STATE;
    this._header.off('header');
    this._body.off('tag');
  }

  headerDataHandler(data) {
    this.emit('header', data);
  }

  tagDataHandler(data) {
    this.emit('tag', data);
  }
}

export default FlvDemux;
