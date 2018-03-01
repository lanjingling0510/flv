import Buffer from '../utils/Buffer';
import Log from '../utils/logger';

class VideoTag {
  static get MIN_LENGTH() {
    return 0;
  }

  static get TYPE() {
    return 9;
  }

  constructor() {

    /*
      帧类型
      -------------
      1 = key frame (for AVC, a seekable frame)
      关键帧，可以从此开始播放 ~！

      2 = inter frame (for AVC, a non-seekable frame)
      非关键帧，不能从此开始播放

      3 = disposable inter frame (H.263 only)
      H263 的一次性非关键帧

      4 = generated key frame (reserved for server use only)
      生成的关键帧。实际流并没有这东西。仍然是给服务端预留的。

      5 = video info/command frame
      信息帧
    */
    this.frameType = 0x01;

    /*
      编码格式
      -------------
      2 = Sorenson H.263
      3 = Screen video
      4 = On2 VP6
      5 = On2 VP6 with alpha channel
      6 = Screen video version 2
      7 = AVC
    */
    this.codecId = 0x01;

    /*
      AVC包类型
      -------------
      0 = AVC sequence header
      CompositionTime 始终为 0 AVCDecoderConfigurationRecord

      1 = AVC NALU
      包含1个或多个NALU （必须是完整的帧！）

      2 = AVC end of sequence (lower level NALU sequence ender is not required or supported)
      然而并不是都有
    */
    this.AVCPacketType = 0x01;

    /*
      解码时间
      -------------------
      CompositionTime = PTS - DTS（FLV timestamp)
      => PTS = CT + DTS
    */
    this.compositionTime = 0x00;
    this.data = new ArrayBuffer(0);
    this.originBuffer = new ArrayBuffer(0);
  }

  decode(buffer, size) {
    this.frameType = (Buffer.readUInt8(buffer, 0) & 240) >> 4;
    this.codecId = Buffer.readUInt8(buffer, 0) & 15;
    if (this.codecId != 7) {
      throw new Error('not support this video type(only AVC support)');
    }

    this.AVCPacketType = Buffer.readUInt8(buffer, 1);

    switch (this.AVCPacketType) {
      case 0:
        Log.v('解析AVCDecoderConfigurationRecord...');
        break;
      case 1:
        // Log.v('解析AVC NALU数据...');
        break;
      case 2:
        Log.v('解析AVC序列尾部...');
        break;
      default:
        break;
    }

    this.compositionTime = Buffer.readUInt32BE(buffer, 2) >> 8;
    this.data = buffer.slice(5, size);
    this.originBuffer = buffer.slice(0, size);

    return buffer.slice(size);
  }

  toJSON() {
    return {
      frameType: this.frameType,
      codecId: this.codecId,
      AVCPacketType: this.AVCPacketType,
      compositionTime: this.compositionTime,
      data: this.data
    };
  }
}

export default VideoTag;
