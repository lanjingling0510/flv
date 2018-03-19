import EventEmitter from '../utils/EventEmitter';
import DemuxController from './DemuxController';
import RemuxController from './RemuxController';
import Log from '../utils/logger';

class Transmuxer extends EventEmitter {
  constructor(config) {
    super();

    this._config = { isLive: true };
    Object.assign(this._config, config);

    this._demuxController = new DemuxController();
    this._remuxController = new RemuxController(this._config);

    this.metas = [];
    this.loadmetadata = false;

    const demuxController = this._demuxController;
    const remuxController = this._remuxController;

    demuxController.on('audioMeta', this.onAudioMeta.bind(this));
    demuxController.on('videoMeta', this.onVideoMeta.bind(this));
    demuxController.on('mediaInfo', this.onMediaInfo.bind(this));
    demuxController.on('availableData', this.onDataAvailable.bind(this));
    remuxController.on('mediaSegment', this.onMediaSegment.bind(this));
  }

  appendBuffer(buffer) {
    this._demuxController.demux(buffer);
  }

  onAudioMeta(meta) {
    const demux = this._demuxController;
    const remux = this._remuxController;

    this.metas.push(meta);
    remux._audioMeta = meta;

    if (demux._hasAudio && !demux._hasVideo) {
      this._metaSucc();
      return;
    }

    if (
      demux._hasVideo &&
      demux._hasAudio &&
      remux._videoMeta &&
      remux._audioMeta
    ) {
      this._metaSucc();
    }
  }

  onVideoMeta(meta) {
    const demux = this._demuxController;
    const remux = this._remuxController;

    this.metas.push(meta);
    remux._videoMeta = meta;

    if (!demux._hasAudio && demux._hasVideo) {
      this._metaSucc();
      return;
    }

    if (
      demux._hasVideo &&
      demux._hasAudio &&
      remux._videoMeta &&
      remux._audioMeta
    ) {
      this._metaSucc();
    }
  }

  onMediaInfo(mediaInfo) {
    this.emit('mediaInfo', mediaInfo);
  }

  onDataAvailable(audiotrack, videotrack) {
    this._remuxController.remux(audiotrack, videotrack);
  }

  onMediaSegment(segment) {
    this.emit('mediaSegment', segment);
  }

  _metaSucc() {
    const remux = this._remuxController;
    if (this.metas.length > 1) {
      this.metas.map(item => {
        if (item.type == 'video') {
          this.ftyp_moov_v = remux.generateInitSegment(item);
        } else {
          this.ftyp_moov_a = remux.generateInitSegment(item);
        }
      });
    } else {
      this.ftyp_moov = remux.generateInitSegment(this.metas[0]);
    }

    if (this.loadmetadata == false) {
      if (this.ftyp_moov) {
        this.emit('initSegment', {
          type: 'video',
          data: this.ftyp_moov
        });
      } else {
        this.emit('initSegment', {
          type: 'video',
          data: this.ftyp_moov_v
        });

        this.emit('initSegment', {
          type: 'audio',
          data: this.ftyp_moov_a
        });
      }

      this.loadmetadata = true;
    }
  }
}

export default Transmuxer;
