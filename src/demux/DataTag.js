import ScriptDataObject from './ScriptDataObject';
import ScriptDataObjectEnd from './ScriptDataObjectEnd';

class DataTag  {
  static get MIN_LENGTH() {
    return 3;
  }

  static get TYPE() {
    return 18;
  }

  constructor() {
    this.originBuffer = new ArrayBuffer(0);
    this.objects = [];
  }

  decode(buffer, size) {
    let body = buffer.slice(0, size);
    let objMinLen = ScriptDataObject.MIN_LENGTH;
    let endMinLen = ScriptDataObjectEnd.MIN_LENGTH;

    for (;;) {
      let bufLen = body.byteLength;

      // if buffer length cant be min length
      // we pass it to keep run next frames right
      if (!bufLen || bufLen < objMinLen + endMinLen) {
        break;
      }

      let object = new ScriptDataObject();
      body = object.decode(body);
      this.objects.push(object);
    }

    this.originBuffer = buffer.slice(0, size);
    return buffer.slice(size);
  }

  toJSON() {
    let objects = this.objects.map(v => {
      return v && v.toJSON ? v.toJSON() : v;
    });

    return Object.assign({}, ...objects);
  }
}

export default DataTag;
