import ScriptDataString from './ScriptDataString';
import ScriptDataValue from './ScriptDataValue';

class ScriptDataObject {
  static get TYPE() {
    return 3;
  }

  static get MIN_LENGTH() {
    return ScriptDataString.MIN_LENGTH + ScriptDataValue.MIN_LENGTH;
  }

  constructor(ignoreTypeCheck = false) {
    this.ignoreTypeCheck = ignoreTypeCheck;
    this.objectName = '';
    this.objectData = null;
  }

  decode(buffer, size = 0) {
    this.objectName = new ScriptDataString(this.ignoreTypeCheck);
    let body = this.objectName.decode(buffer);
    this.objectData = new ScriptDataValue();
    body = this.objectData.decode(body);
    return body;
  }

  toJSON() {
    let objectName = this.objectName;
    let objectData = this.objectData;
    objectName = objectName && objectName.toJSON ? objectName.toJSON() : '';
    objectData = objectData && objectData.toJSON ? objectData.toJSON() : null;

    return {
      [objectName]: objectData
    };
  }
}

export default ScriptDataObject;
