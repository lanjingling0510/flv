import ScriptDataString from './ScriptDataString';
import ScriptDataValue from './ScriptDataValue';

class ScriptDataVar {
  static get MIN_LENGTH() {
    return ScriptDataString.MIN_LENGTH + ScriptDataValue.MIN_LENGTH;
  }

  constructor() {
    this.varName = '';
    this.varData = null;
  }

  decode(buffer) {
    this.varName = new ScriptDataString(true);
    let body = this.varName.decode(buffer);
    this.varData = new ScriptDataValue();
    body = this.varData.decode(body);
    return body;
  }

  toJSON() {
    let varName = this.varName;
    varName = varName && varName.toJSON ? varName.toJSON() : '';
    let varData = this.varData;
    varData = varData && varData.toJSON ? varData.toJSON() : null;

    return {
      [varName]: varData
    };
  }
}

export default ScriptDataVar;
