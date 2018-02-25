import Buffer from '../utils/Buffer';

class ScriptDataString {
  static get MIN_LENGTH() {
    return 2;
  }

  static get TYPE() {
    return 2;
  }

  constructor(ignoreTypeCheck = false) {
    this.ignoreTypeCheck = ignoreTypeCheck;
    this.length = 0x00;
    this.data = '';
  }

  decode(buffer) {
    if (!this.ignoreTypeCheck) {
      let type = Buffer.readUInt8(buffer, 0);

      // 类型必须是2
      if (type != ScriptDataString.TYPE) {
        throw new Error('不是ScriptDataString类型');
      }
    }

    let offset = this.ignoreTypeCheck ? 0 : 1;
    this.length = Buffer.readUInt16BE(buffer, offset);
    this.data = Buffer.readToString(
      buffer.slice(2 + offset, this.length + 2 + offset)
    );
    return buffer.slice(this.length + 2 + offset);
  }

  toJSON() {
    return {
      type: ScriptDataString.TYPE,
      length: this.length,
      data: this.data
    };
  }
}

export default ScriptDataString;
