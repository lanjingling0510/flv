import EventEmitter from '../utils/EventEmitter';
import Buffer from '../utils/Buffer';
import Tag from './Tag';

class Body extends EventEmitter {
  static get MIN_LENGTH() {
    // 第一个PreviousTagSize0
    return 4;
  }

  static get STATE() {
    return 'body';
  }

  constructor() {
    super();
  }

  decode(buffer) {
    for (;;) {
      if (buffer.byteLength < Body.MIN_LENGTH) {
        break;
      }

      // 第一个PreviousTagSize0
      let tagSize = Buffer.readUInt32BE(buffer, 0);
      let body = buffer.slice(4);

      if (body.byteLength < Tag.MIN_LENGTH) {
        // 当前buffer小于可解析的PreviousTagSize0
        // 请继续插入新的buffer...
        return {
          data: buffer,
          success: false
        };
      }

      let tag = new Tag();
      body = tag.decode(body);
      if (!body) {
        // 当前buffer小于可解析的Tag
        // 请继续插入新的buffer...
        return {
          data: buffer,
          success: false
        };
      }

      let data = tag.toJSON();

      let tagSizeBuffer = new ArrayBuffer(32);
      let tagSizeArray = new Uint32Array(tagSizeBuffer);

      tagSizeArray[0] = tagSize;
      data.tagSizeBuffer = tagSizeArray.buffer;
      this.emit('tag', data);
      buffer = body;
    }

    return {
      data: buffer,
      success: true
    };
  }
}

export default Body;
