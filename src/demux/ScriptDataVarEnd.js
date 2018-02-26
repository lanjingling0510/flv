import Buffer from '../utils/Buffer';

class ScriptDataVarEnd {
  static get MIN_LENGTH() {
    return 3;
  }

  static get TYPE() {
    return 9;
  }

  constructor() {
    this.ended = false;
  }

  decode(buffer) {
    let mark = Buffer.readUInt24BE(buffer, 0);
    if (mark != ScriptDataVarEnd.TYPE) {
      throw new Error(`出错ScriptDataVar结尾标记：(${mark})`);
    }

    this.ended = true;
    return buffer.slice(3);
  }

  toJSON() {
    return {
      type: ScriptDataVarEnd.TYPE,
      ended: this.ended
    };
  }
}

export default ScriptDataVarEnd;
