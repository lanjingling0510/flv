import EventEmitter from '../utils/EventEmitter';

const Status = {
  Idle: 0,
  Connecting: 1,
  Buffering: 2,
  Error: 3,
  Complete: 4
};

class FetchLoader extends EventEmitter {
  constructor() {
    super();

    this._url = '';
    this._receivedLength = 0;
    this._status = Status.Idle;
    this.requestAbort = false;
  }

  open(url) {
    this._url = url;

    let params = {
      method: 'GET',
      mode: 'cors',
      cache: 'default',
      referrerPolicy: 'no-referrer-when-downgrade'
    };

    this._status = Status.Connecting;

    window
      .fetch(this._url)
      .then(res => {
        if (res.ok && res.status >= 200 && res.status <= 299) {
          return this._pump.call(this, res.body.getReader());
        } else {
          this._status = Status.Error;
        }
      })
      .catch(err => {
        this._status = Status.Error;
      });
  }

  pause() {
    this.requestAbort = true;
  }

  _pump(reader) {
    // ReadableStreamReader
    return reader
      .read()
      .then(result => {
        if (result.done) {
          this._status = Status.Complete;
        } else {
          if (this.requestAbort === true) {
            this.requestAbort = false;
            return reader.cancel();
          }
          this._status = Status.Buffering;
          let chunk = result.value.buffer;
          let byteStart = this._receivedLength;
          this._receivedLength += chunk.byteLength;

          this.emit('dataArrival', {
            chunk: chunk,
            byteStart: byteStart,
            byteLength: chunk.byteLength
          });

          this._pump(reader);
        }
      })
      .catch(err => {
        console.error(err);
      });
  }
}

export default FetchLoader;
