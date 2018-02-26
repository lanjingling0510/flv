import EventEmitter from '../utils/EventEmitter';
import Header from './Header';
import Body from './Body';

import Buffer from '../utils/Buffer';

class FlvDemux extends EventEmitter {
  constructor() {
    super();

    // 当前解码的状态
    this._state = Header.STATE;

    // 当前存储的buffer
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

        // 解析Header
        case Header.STATE: {
          if (this._buffer.byteLength < Header.MIN_LENGTH) {
            // 当前buffer小于可解析的Header
            // 请继续插入新的buffer...
            return;
          }

          let body = this._header.decode(this._buffer);
          if (!body) {
            throw new Error('not right spec header');
          }

          this._buffer = body;
          this._state = Body.STATE;
          break;
        }

        // 解析Body
        case Body.STATE: {
          if (this._buffer.byteLength < Body.MIN_LENGTH) {
            // 当前buffer小于可解析的Body
            // 请继续插入新的buffer...
            return;
          }

          let body = this._body.decode(this._buffer);
          this._buffer = body.data;
          if (body.success) {
            console.log('解析tag成功...');
          } else {
            return;
          }

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
