const Log = {
  v(tag, msg) {
    if (arguments.length === 1) {
      msg = tag;
      tag = Log.GLOBAL_TAG;
    }

    if (!tag || Log.FORCE_GLOBAL_TAG) {
      tag = Log.GLOBAL_TAG;
    }

    // if (typeof msg === 'object') {
    //   msg = JSON.stringify(msg, null, 2);
    // }

    let str = `[${tag}] > ${msg}`;
    this.fire('info', str);
    if (Log.ENABLE_VERBOSE) {
      console.log(' %c%s', 'color: brown; font-weight: bold; text-decoration: underline;', tag, msg);
    }
  },

  err(tag, msg) {
    if (arguments.length === 1) {
      msg = tag;
      tag = Log.GLOBAL_TAG;
    }

    if (!tag || Log.FORCE_GLOBAL_TAG) {
      tag = Log.GLOBAL_TAG;
    }

    if (typeof msg === 'object') {
      msg = JSON.stringify(msg, null, 2);
    }

    let str = `[${tag}] > ${msg}`;
    this.fire('error', str);
    if (Log.ENABLE_VERBOSE) {
      console.error(str);
    }
  },

  on(key, listener) {
    if (!this._events) {
      this._events = {};
    }
    if (!this._events[key]) {
      this._events[key] = [];
    }
    if (
      !this._events[key].indexOf(listener) !== -1 &&
      typeof listener === 'function'
    ) {
      this._events[key].push(listener);
    }
    return this;
  },

  fire(key) {
    let args = Array.prototype.slice.call(arguments, 1) || [];
    if (!this._events || !this._events[key]) {
      return;
    }
    let listeners = this._events[key];
    let i = 0;
    let l = listeners.length;
    for (i; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return this;
  },

  evt(obj) {
    this.v('打点evt', obj);
  },

  click(obj) {
    this.v('打点click', obj);
  }
};

Log.GLOBAL_TAG = 'qm player';
Log.FORCE_GLOBAL_TAG = false;
Log.ENABLE_VERBOSE = true;

export default Log;
