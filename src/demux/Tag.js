import EventEmitter from '../utils/EventEmitter';
import Buffer from '../utils/Buffer';
import AudioTag from './AudioTag';
import VideoTag from './VideoTag';
import DataTag from './DataTag';

class Tag extends EventEmitter {
  static get MIN_LENGTH() {
    return 11;
  }

  static get STATE() {
    return 'tag';
  }

  constructor() {
    super();

    /*
      TagType / UI8
      ------------------
      8: audio
      9: video
      18: script data
    */
    this.type = 0x00;

    /*
      DataSize / UI24
      ------------------
      在数据区的长度
    */
    this.dataSize = 0x00;

    /*
      Timestamp / UI32
      ------------------
      整数，单位毫秒。对于脚本型tag总是0
      of 0.
    */
    this.timestamp = 0x00;

    /*
      SteamId / UI8
      ------------------
      总是0
    */
    this.streamId = 0x00;


    this.dataTag = null;
    this.prevBuffer = new ArrayBuffer(0);
  }

  decode(buffer) {
    this.type = Buffer.readUInt8(buffer, 0);
    this.dataSize = Buffer.readUInt24BE(buffer, 1);

    const ts0 = Buffer.readUInt24BE(buffer, 4);
    const ts1 = Buffer.readUInt8(buffer, 7);
    this.timestamp = (ts1 << 24) | ts0;

    this.streamId = Buffer.readUInt24BE(buffer, 8) >> 8;
    this.prevBuffer = buffer.slice(0, 11);

    if (this.streamId != 0) {
      throw new Error(`Tag stream id must be 0, get(${this.streamId})`);
    }

    if (buffer.byteLength < Tag.MIN_LENGTH + this.dataSize) {
      return false;
    }

    switch (this.type) {
      case AudioTag.TYPE:
        this.dataTag = new AudioTag();
        break;
      case VideoTag.TYPE:
        this.dataTag = new VideoTag();
        break;
      case DataTag.TYPE:
        this.dataTag = new DataTag();
        break;
      default:
        throw new Error(`不支持tag类型(${this.type})`);
    }

    buffer = buffer.slice(Tag.MIN_LENGTH);
    let body = this.dataTag.decode(buffer, this.dataSize);
    return !body ? false : body;
  }

  toJSON() {
    let dataTag = this.dataTag;
    let originBuffer = Buffer.concat(this.prevBuffer, dataTag.originBuffer);
    const data = dataTag && dataTag.toJSON ? dataTag.toJSON() : null;
    return {
      type: this.type,
      dataSize: this.dataSize,
      timestamp: this.timestamp,
      streamId: this.streamId,
      data: data,
      originBuffer: originBuffer
    };
  }
}

export default Tag;
