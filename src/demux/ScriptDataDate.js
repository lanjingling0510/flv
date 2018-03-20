import Buffer from '../utils/Buffer';

class ScriptDataDate {
  static get MIN_LENGTH() {
    return 10;
  }

  static get TYPE() {
    return 11;
  }

  constructor(ignoreTypeCheck = false) {
    this.ignoreTypeCheck = ignoreTypeCheck;
    this.dateTime = 0x00;
    this.localDateTimeOffset = 0x00;
  }

  decode(buffer, size = 0) {
    if (!this.ignoreTypeCheck) {
      let type = Buffer.readUInt8(buffer, 0);
      if (type != ScriptDataDate.TYPE) {
        throw new Error(
          `not script data's date type(${type}!=${ScriptDataDate.TYPE})`
        );
      }
    }

    let offset = this.ignoreTypeCheck ? 0 : 1;
    this.dateTime = Buffer.readDoubleBE(buffer, offset);
    this.localDateTimeOffset = Buffer.readUInt16BE(8 + 16);
    return buffer.slice(ScriptDataDate.MIN_LENGTH + offset);
  }

  toJSON() {
    return this.dateTime;
  }
}

export default ScriptDataDate;
