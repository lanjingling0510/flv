import ScriptDataString from './ScriptDataString';
import ScriptDataObject from './ScriptDataObject';
import ScriptDataObjectEnd from './ScriptDataObjectEnd';
import ScriptDataVar from './ScriptDataVar';
import ScriptDataVarEnd from './ScriptDataVarEnd';
import ScriptDataDate from './ScriptDataDate';
import ScriptDataLongString from './ScriptDataLongString';
import Buffer from '../utils/Buffer';


class ScriptDataValue {
  static get MIN_LENGTH() {
    return 1;
  }

  static get TYPES() {
    return {
      NUMBER: 0,
      BOOLEAN: 1,
      STRING: 2,
      OBJECT: 3,
      MOVIECLIP: 4,
      NULL: 5,
      UNDEFINED: 6,
      REF: 7,
      ECMA_ARRAY: 8,
      STRICT_ARRAY: 10,
      DATE: 11,
      LONG_STRING: 12
    };
  }

  constructor() {
    this.type = 0x00;
    this.ECMAArrayLength = -1;
    this.value = null;
    this.terminator = null;
  }

  decode(buffer) {
    const TYPES = ScriptDataValue.TYPES;
    this.type = Buffer.readUInt8(buffer, 0);
    buffer = buffer.slice(1);
    switch (this.type) {
      case TYPES.NUMBER:
        this.value = Buffer.readDoubleBE(buffer, 0);
        buffer = buffer.slice(8);
        break;
      case TYPES.BOOLEAN:
        this.value = !!Buffer.readUInt8(buffer, 0);
        buffer = buffer.slice(1);
        break;
      case TYPES.STRING:
      case TYPES.MOVIECLIP:
        this.value = new ScriptDataString(true);
        buffer = this.value.decode(buffer);
        break;
      case TYPES.OBJECT:
        this.terminator = new ScriptDataObjectEnd();
        for (;;) {
          this.value = new ScriptDataObject(true);
          buffer = this.value.decode(buffer);

          buffer = this.terminator.decode(buffer);
          if (this.terminator.ended) {
            break;
          }
        }

        break;
      case TYPES.UNDEFINED:
        this.value = undefined;
        break;
      case TYPES.NULL:
        this.value = null;
        break;
      case TYPES.REF:
        this.value = Buffer.readUInt16BE(0);
        buffer = buffer.slice(3);
        break;
      case TYPES.ECMA_ARRAY:
        this.value = [];
        this.ECMAArrayLength = Buffer.readUInt32BE(buffer, 0);
        buffer = buffer.slice(4);
        for (let i = 0, len = this.ECMAArrayLength; i < len; i++) {
          let item = new ScriptDataVar();
          buffer = item.decode(buffer);
          this.value.push(item);
        }

        this.terminator = new ScriptDataVarEnd();
        buffer = this.terminator.decode(buffer);
        break;
      case TYPES.STRICT_ARRAY:
      {
        let n = Buffer.readUInt32BE(buffer, 0);
        this.value = [];
        buffer = buffer.slice(4);
        for (let i = 0; i < n; i++) {
          let item = new ScriptDataValue();
          buffer = item.decode(buffer);
          this.value.push(item);
        }
        break;
      }
      case TYPES.DATE:
        this.value = new ScriptDataDate(true);
        buffer = this.value.decode(buffer);
        break;
      case TYPES.LONG_STRING:
        this.value = new ScriptDataLongString(true);
        buffer = this.value.decode(buffer);
        break;
      default:
        throw new Error(`不支持ScriptDataValue类型：(${this.type})`);
    }

    return buffer;
  }

  toJSON() {
    let value = this.value;
    if (Object.prototype.toString.call(value) == '[object Array]') {
      value = value.map(v => {
        return v && v.toJSON ? v.toJSON() : v;
      });
    } else if (value && value.toJSON) {
      value = value.toJSON();
    }

    let terminator = this.terminator;
    terminator = terminator && terminator.toJSON ? terminator.toJSON() : null;

    return {
      type: this.type,
      ECMAArrayLength: this.ECMAArrayLength,
      value: value,
      terminator: terminator
    };
  }
}

export default ScriptDataValue;
