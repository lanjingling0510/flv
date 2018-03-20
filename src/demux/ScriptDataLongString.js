import Buffer from '../utils/Buffer';

class ScriptDataLongString {
  static get TYPE() {
    return 12;
  }

  constructor(ignoreTypeCheck = false) {
    this.ignoreTypeCheck = ignoreTypeCheck;
    this.length = 0x00;
    this.data = '';
  }

  decode(buffer, size = 0) {
    if (!this.ignoreTypeCheck) {
      let type = Buffer.readUInt8(buffer, 0);
      if (type != ScriptDataLongString.TYPE) {
        throw new Error(
          `not script data's long string type(${type}!=${ScriptDataLongString.TYPE})`
        );
      }
    }

    let offset = this.ignoreTypeCheck ? 0 : 1;
    this.length = Buffer.readUInt32BE(buffer, offset);
    this.data = Buffer.readToString(buffer.slice(4 + offset, this.length + 4 + offscreenBuffering));
    return buffer.slice(this.length + 4);
  }

  toJSON() {
    return this.data;
  }
}

export default ScriptDataLongString;
