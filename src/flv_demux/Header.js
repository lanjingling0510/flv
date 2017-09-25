import EventEmitter from '../utils/EventEmitter';
import Buffer from '../utils/Buffer';

class Header extends EventEmitter {
  static get MIN_LENGTH() {
    // The DataOffset field usually has a value of 9 for FLV version 1.
    return 9;
  }

  static get STATE() {
    return 'header';
  }

  constructor() {
    super();
    this._signature = 'FLV';
    this._version = 0x01;
    this._hasAudio = false;
    this._hasVideo = false;
    this._offset = 0x00;
  }

  decode(buffer) {
    const data = new Uint8Array(buffer);
    if (
      data[0] !== 0x46 ||
      data[1] !== 0x4c ||
      data[2] !== 0x56 ||
      data[3] !== 0x01
    ) {
      return false;
    }

    this._version = data[3];
    this._hasAudio = ((data[4] & 4) >>> 2) !== 0;
    this._hasVideo = (data[4] & 1) !== 0;
    this._offset = (new DataView(buffer, 5)).getInt32(0, false);

    // this._offset should equal flv header size.
    if (this._offset !== 9) {
      return false;
    }

    this.emit('header', {
      signature: this._signature,
      version: this._version,
      hasAudio: this._hasAudio,
      hasVideo: this._hasVideo,
      offset: this._offset
    });

    return buffer.slice(9);
  }
}

export default Header;
