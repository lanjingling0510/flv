class EventEmitter {
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
  }

  emit(key) {
    if (!this._events || !this._events[key]) return;
    var args = Array.prototype.slice.call(arguments, 1) || [];
    var listeners = this._events[key];
    var i = 0;
    var l = listeners.length;
    for (i; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return this;
  }

  off(key, listener) {
    if (!key && !listener) {
      _events = {};
    }

    if (key && !listener) {
      delete this._events[key];
    }

    if (key && listener) {
      const listeners = this._events[key];
      const index = listeners.indexOf(listener);
      listeners.splice(index, 1);
    }
    return this;
  }
}

export default EventEmitter;
