import EventEmitter from '../utils/EventEmitter';
import Log from '../core/logger';
import Buffer from '../utils/Buffer';

class AudioTag extends EventEmitter {
  static get MIN_LENGTH() {
    return 0;
  }

  static get TYPE() {
    return 8;
  }

  constructor() {
    super();

    /*
      soundFormat / UB[4]
      ------------------
      2 = MP3
      10 = AAC
    */
    this.soundFormat = 0x00;

    /*
      soundRate / UB[2]
      ------------------
      0 = 5.5-kHz
      1 = 11-kHz
      2 = 22-kHz
      3 = 44-kHz
      对于AAC总为3
    */
    this.soundRate = 0x00;

    /*
      soundSize / UB[1]
      ------------------
      0 = snd8Bit
      1 = snd16Bit
      压缩过的音频都是16bit
    */
    this.soundSize = 0x00;

    /*
      soundType / UB[1]
      ------------------
      0 = sndMono
      1 = sndStereo
      对于ACC总为1
    */
    this.soundType = 0x00;

    /*
      AACPacketType / UI8
      -------------------
      0: AAC sequence header
      1: AAC raw
    */
    this.AACPacketType = -1;

    this.data = new ArrayBuffer(0);
    this.originBuffer = new ArrayBuffer(0);
  }

  decode(buffer, size) {
    const data = Buffer.readUInt8(buffer, 0);
    this.soundFormat = (data & 240) >> 4;
    this.soundRate = (data & 12) >> 2;
    this.soundSize = (data & 2) >> 1;
    this.sounceType = (data & 1);

    if (this.soundFormat != 10) {
      throw new Error('只支持AAC');
    }

    this.AACPacketType = Buffer.readUInt8(buffer, 1);
    this.data = buffer.slice(2, size);
    this.originBuffer = buffer.slice(0, size);

    if (this.AACPacketType === 0) {
      Log.v('解析AudioSpecificConfig...');
      // data 是 AudioSpecificConfig
      // .....
    } else if (this.AACPacketType === 1) {
      Log.v('解析AAC帧数据...');
      // data 是 Raw AAC frame data
      // .....
    }

    return buffer.slice(size);
  }

  toJSON() {
    return {
      soundFormat: this.soundFormat,
      soundRate: this.soundRate,
      soundSize: this.soundSize,
      soundType: this.soundType,
      AACPacketType: this.AACPacketType,
      data: this.data
    };
  }
}

export default AudioTag;
