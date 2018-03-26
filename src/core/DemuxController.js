import EventEmitter from '../utils/EventEmitter';
import MediaInfo from './MediaInfo';
import SPSParser from '../utils/SPSParser';
import Demux from '../demux';
import Log from '../utils/logger';

class DemuxController extends EventEmitter {
  constructor() {
    super();
    this._mediaInfo = new MediaInfo();
    this._demux = new Demux();

    this._metadata = null;
    this._audioMetadata = null;
    this._videoMetadata = null;

    this._hasAudio = false;
    this._hasVideo = false;

    this._timescale = 1000;
    this._duration = 0;
    this._timestampBase = 0;

    this._audioInitialMetadataDispatched = false;
    this._videoInitialMetadataDispatched = false;

    this._referenceFrameRate = {
      fixed: true,
      fps: 23.976,
      fps_num: 23976,
      fps_den: 1000
    };

    this._videoTrack = {
      type: 'video',
      id: 1,
      sequenceNumber: 0,
      addcoefficient: 2,
      samples: [],
      length: 0
    };
    this._audioTrack = {
      type: 'audio',
      id: 2,
      sequenceNumber: 0,
      addcoefficient: 2,
      samples: [],
      length: 0
    };

    this._demux.on('header', this.onFlvHeader.bind(this));
    this._demux.on('tag', this.onFlvTag.bind(this));
  }

  demux(buffer) {
    this._demux.decode(buffer);
  }

  onFlvHeader(header) {
    Log.v('FLV header', header);
    this._hasAudio = this._mediaInfo.hasAudio = header.hasAudio;
    this._hasVideo = this._mediaInfo.hasVideo = header.hasVideo;
  }

  onFlvTag(tag) {
    switch (tag.type) {
      case 8: // AudioTag
        this._parseAudioTag(tag);
        break;
      case 9: // VideoTag
        this._parseVideoTag(tag);
        break;
      case 18: // DataTag
        this._parseDataTag(tag);
        break;
    }

    if (this._isInitialMetadataDispatched()) {
      if (this._audioTrack.length || this._videoTrack.length) {
        this.emit('availableData', this._audioTrack, this._videoTrack);
      }
    }
  }

  _parseAudioTag(tag) {
    if (tag.timestamp === this._timestampBase && this._timestampBase != 0) {
      throw new Error(
        tag.timestamp,
        this._timestampBase,
        '夭寿啦这个视频不是从0开始'
      );
    }

    const data = tag.data;
    const packetType = data.AACPacketType;

    if (packetType === 0) {
      // AACAudioSpecificConfig
      this._parseAACAudioSpecificConfig(data);
    } else if (packetType === 1) {
      this._parseAACAudioData(data, tag.timestamp);
    }
  }

  _parseVideoTag(tag) {
    if (tag.timestamp === this._timestampBase && this._timestampBase != 0) {
      throw new Error(
        tag.timestamp,
        this._timestampBase,
        '夭寿啦这个视频不是从0开始'
      );
    }

    const data = tag.data;
    const packetType = data.AVCPacketType;

    if (packetType === 0) {
      // AVCDecoderConfigurationRecord
      this._parseAVCDecoderConfigurationRecord(data);
    } else if (packetType === 1) {
      // One or more Nalus
      this._parseAVCVideoData(data, tag.timestamp);
    }
  }

  /**
   * 解析DataTag
   */
  _parseDataTag(tag) {
    const scriptData = tag.data;

    if (scriptData.hasOwnProperty('onMetaData')) {
      if (this._metadata) {
        console.error(this.TAG, '没有找到onMetaData...');
      }

      this._metadata = scriptData;
      const onMetaData = this._metadata.onMetaData;

      if (typeof onMetaData.hasAudio === 'boolean') {
        // hasAudio
        this._hasAudio = onMetaData.hasAudio;
        this._mediaInfo.hasAudio = this._hasAudio;
      }

      if (typeof onMetaData.hasVideo === 'boolean') {
        // hasVideo
        this._hasVideo = onMetaData.hasVideo;
        this._mediaInfo.hasVideo = this._hasVideo;
      }

      if (typeof onMetaData.audiodatarate === 'number') {
        // audiodatarate
        this._mediaInfo.audioDataRate = onMetaData.audiodatarate;
      }

      if (typeof onMetaData.videodatarate === 'number') {
        // videodatarate
        this._mediaInfo.videoDataRate = onMetaData.videodatarate;
      }

      if (typeof onMetaData.width === 'number') {
        // width
        this._mediaInfo.width = onMetaData.width;
      }

      if (typeof onMetaData.height === 'number') {
        // height
        this._mediaInfo.height = onMetaData.height;
      }

      if (typeof onMetaData.duration === 'number') {
        // duration
        const duration = Math.floor(onMetaData.duration * this._timescale);
        this._duration = duration;
        this._mediaInfo.duration = duration;
      } else {
        this._mediaInfo.duration = 0;
      }

      if (typeof onMetaData.framerate === 'number') {
        // framerate
        const fps_num = Math.floor(onMetaData.framerate * 1000);
        if (fps_num > 0) {
          const fps = fps_num / 1000;
          this._referenceFrameRate.fixed = true;
          this._referenceFrameRate.fps = fps;
          this._referenceFrameRate.fps_num = fps_num;
          this._referenceFrameRate.fps_den = 1000;
          this._mediaInfo.fps = fps;
        }
      }

      if (typeof onMetaData.keyframes === 'object') {  // keyframes
        this._mediaInfo.hasKeyframesIndex = true;

        let keyframes = onMetaData.keyframes;
        keyframes.times = keyframes.times || onMetaData.time;
        keyframes.filepositions = keyframes.filepositions || onMetaData.filepositions;

        if (keyframes.times && keyframes.filepositions) {
          this._mediaInfo.keyframesIndex = this._parseKeyframesIndex(keyframes);
          onMetaData.keyframes = null;  // keyframes has been extracted, remove it
        }
      } else {
        this._mediaInfo.hasKeyframesIndex = false;
      }

      this._mediaInfo.metadata = onMetaData;
      Log.v('.onMetaData解析成功...');
      Log.v('mediaInfo', this._mediaInfo);
      return this._mediaInfo;
    }
  }

  _parseAACAudioData(tagData, tagTimestamp) {
    const track = this._audioTrack;
    const dts = this._timestampBase + tagTimestamp;
    const unit = new Uint8Array(tagData.data);
    const aacSample = { unit: unit, dts, pts: dts };
    track.samples.push(aacSample);
    track.length += unit.length;
  }

  _parseAVCVideoData(tagData, tagTimestamp) {
    const v = new DataView(tagData.data, 0);
    const dts = this._timestampBase + tagTimestamp;
    const cts = tagData.compositionTime;
    let keyframe = tagData.frameType === 1;
    const lengthSize = this._naluLengthSize;
    const dataSize = tagData.data.byteLength;
    let offset = 0;
    let length = 0;
    const units = [];

    while (offset < dataSize) {
      if (offset + 4 >= dataSize) {
        console.log(
          `Malformed Nalu near timestamp ${dts}, offset = ${offset}, dataSize = ${dataSize}`
        );
        // data not enough for next Nalu
        break;
      }

      // Nalu with length-header (AVC1)
      let naluSize = v.getUint32(offset, false);
      if (lengthSize === 3) {
        naluSize >>>= 8;
      }

      if (naluSize > dataSize - lengthSize) {
        console.log(
          `Malformed Nalus near timestamp ${dts}, NaluSize > DataSize!`
        );
        return;
      }

      const unitType = v.getUint8(offset + lengthSize) & 0x1f;

      if (unitType === 5) {
        // IDR
        keyframe = true;
      }

      const data = new Uint8Array(tagData.data, offset, lengthSize + naluSize);
      const unit = { type: unitType, data };
      units.push(unit);
      length += data.byteLength;
      offset += lengthSize + naluSize;
    }

    if (units.length) {
      const track = this._videoTrack;
      const avcSample = {
        units,
        length,
        isKeyframe: keyframe,
        dts,
        cts,
        pts: dts + cts
      };
      if (keyframe) {
        avcSample.fileposition = 0;
      }

      track.samples.push(avcSample);
      track.length += length;
    }
  }

  _parseAACAudioSpecificConfig(tagData) {
    let meta = this._audioMetadata;
    const track = this._audioTrack;

    if (!meta) {
      // initial metadata
      meta = this._audioMetadata = {};
      meta.type = 'audio';
      meta.id = track.id;
      meta.timescale = this._timescale;
      meta.duration = this._duration;

      let soundRate = 0;
      const soundRateTable = [5500, 11025, 22050, 44100, 48000];
      const soundRateIndex = tagData.soundRate;

      if (soundRateIndex < soundRateTable.length) {
        soundRate = soundRateTable[soundRateIndex];
      }

      meta.audioSampleRate = soundRate;
      meta.channelCount = tagData.soundType === 0 ? 1 : 2;
      meta.refSampleDuration = Math.floor(
        1024 / meta.audioSampleRate * meta.timescale
      );
      meta.codec = 'mp4a.40.5';
    } else {
      if (typeof meta.avcc !== 'undefined') {
        console.error('发现另一个AACDecoderConfigurationRecord');
      }
    }

    const array = new Uint8Array(tagData.data);
    let config = null;

    const mpegSamplingRates = [
      96000,
      88200,
      64000,
      48000,
      44100,
      32000,
      24000,
      22050,
      16000,
      12000,
      11025,
      8000,
      7350
    ];

    /* Audio Object Type:
       0: Null
       1: AAC Main
       2: AAC LC
       3: AAC SSR (Scalable Sample Rate)
       4: AAC LTP (Long Term Prediction)
       5: HE-AAC / SBR (Spectral Band Replication)
       6: AAC Scalable
    */

    let audioObjectType = 0;
    let originalAudioObjectType = 0;
    let audioExtensionObjectType = null;
    let samplingIndex = 0;
    let extensionSamplingIndex = null;
    // debugger;
    // 5 bits
    audioObjectType = originalAudioObjectType = array[0] >>> 3;
    // 4 bits
    samplingIndex = ((array[0] & 0x07) << 1) | (array[1] >>> 7);
    if (samplingIndex < 0 || samplingIndex >= mpegSamplingRates.length) {
      throw new Error('Flv: AAC invalid sampling frequency index!');
    }

    const samplingFrequence = mpegSamplingRates[samplingIndex];

    // 4 bits
    const channelConfig = (array[1] & 0x78) >>> 3;
    if (channelConfig < 0 || channelConfig >= 8) {
      throw new Error('Flv: AAC invalid channel configuration');
    }

    if (audioObjectType === 5) {
      // HE-AAC?
      // 4 bits
      extensionSamplingIndex = ((array[1] & 0x07) << 1) | (array[2] >>> 7);
      // 5 bits
      audioExtensionObjectType = (array[2] & 0x7c) >>> 2;
    }

    // workarounds for various browsers
    const userAgent = self.navigator.userAgent.toLowerCase();

    if (userAgent.indexOf('firefox') !== -1) {
      // firefox: use SBR (HE-AAC) if freq less than 24kHz
      if (samplingIndex >= 6) {
        audioObjectType = 5;
        config = new Array(4);
        extensionSamplingIndex = samplingIndex - 3;
      } else {
        // use LC-AAC
        audioObjectType = 2;
        config = new Array(2);
        extensionSamplingIndex = samplingIndex;
      }
    } else if (userAgent.indexOf('android') !== -1) {
      // android: always use LC-AAC
      audioObjectType = 2;
      config = new Array(2);
      extensionSamplingIndex = samplingIndex;
    } else {
      // for other browsers, e.g. chrome...
      // Always use HE-AAC to make it easier to switch aac codec profile
      audioObjectType = 5;
      extensionSamplingIndex = samplingIndex;
      config = new Array(4);

      if (samplingIndex >= 6) {
        extensionSamplingIndex = samplingIndex - 3;
      } else if (channelConfig === 1) {
        // Mono channel
        audioObjectType = 2;
        config = new Array(2);
        extensionSamplingIndex = samplingIndex;
      }
    }

    config[0] = audioObjectType << 3;
    config[0] |= (samplingIndex & 0x0f) >>> 1;
    config[1] = (samplingIndex & 0x0f) << 7;
    config[1] |= (channelConfig & 0x0f) << 3;
    if (audioObjectType === 5) {
      config[1] |= (extensionSamplingIndex & 0x0f) >>> 1;
      config[2] = (extensionSamplingIndex & 0x01) << 7;
      // extended audio object type: force to 2 (LC-AAC)
      config[2] |= 2 << 2;
      config[3] = 0;
    }

    const aacData = {
      config,
      samplingRate: samplingFrequence,
      channelCount: channelConfig,
      codec: 'mp4a.40.' + audioObjectType,
      originalAudioObjectType
    };

    if (meta.config) {
      console.log('发现另一个AudioSpecificConfig');
    }

    meta.audioSampleRate = aacData.samplingRate;
    meta.channelCount = aacData.channelCount;
    meta.codec = aacData.codec;
    meta.config = aacData.config;
    // The decode result of an aac sample is 1024 PCM samples
    meta.refSampleDuration = Math.floor(
      1024 / meta.audioSampleRate * meta.timescale
    );

    Log.v('AudioSpecificConfig解析成功...');

    if (this._isInitialMetadataDispatched()) {
      // Non-initial metadata, force dispatch (or flush) parsed frames to remuxer
      if (this._audioTrack.length || this._videoTrack.length) {
        this.emit('availableData', this._audioTrack, this._videoTrack);
      }
    } else {
      this._audioInitialMetadataDispatched = true;
    }

    const mi = this._mediaInfo;
    mi.audioCodec = 'mp4a.40.' + aacData.originalAudioObjectType;
    mi.audioSampleRate = meta.audioSampleRate;
    mi.audioChannelCount = meta.channelCount;
    if (mi.hasVideo) {
      if (mi.videoCodec != null) {
        mi.mimeType =
          'video/x-flv; codecs="' + mi.videoCodec + ',' + mi.audioCodec + '"';
      }
    } else {
      mi.mimeType = 'video/x-flv; codecs="' + mi.audioCodec + '"';
    }

    this.emit('audioMeta', meta);

    if (mi.isComplete()) {
      this.emit('mediaInfo', mi);
    }
  }

  _parseAVCDecoderConfigurationRecord(tagData) {
    let meta = this._videoMetadata;
    const track = this._videoTrack;

    const v = new DataView(tagData.data, 0);

    if (!meta) {
      meta = this._videoMetadata = {};
      meta.type = 'video';
      meta.id = track.id;
      meta.timescale = this._timescale;
      meta.duration = this._duration;
    } else {
      if (typeof meta.avcc !== 'undefined') {
        console.error('发现另一个AVCDecoderConfigurationRecord');
      }
    }

    // configurationVersion
    const version = v.getUint8(0);
    // avcProfileIndication
    const avcProfile = v.getUint8(1);
    // profile_compatibility
    const profileCompatibility = v.getUint8(2);
    // AVCLevelIndication
    const avcLevel = v.getUint8(3);

    if (version !== 1 || avcProfile === 0) {
      throw new Error('无效的AVCDecoderConfigurationRecord');
    }

    // lengthSizeMinusOne
    this._naluLengthSize = (v.getUint8(4) & 3) + 1;
    if (this._naluLengthSize !== 3 && this._naluLengthSize !== 4) {
      throw new Error(
        `无效的NaluLengthSizeMinusOne: ${this._naluLengthSize - 1}`
      );
    }

    // numOfSequenceParameterSets（sps的个数）
    const spsCount = v.getUint8(5) & 31;
    if (spsCount === 0 || spsCount > 1) {
      throw new Error(`无效的H264 SPS 个数${spsCount}`);
    }

    // sequenceParameterSetLength(SPS的长度)
    let offset = 6;

    for (let i = 0; i < spsCount; i++) {
      // sequenceParameterSetLength
      const len = v.getUint16(offset, false);
      offset += 2;

      if (len === 0) {
        continue;
      }

      // Notice: Nalu without startcode header (00 00 00 01)
      const sps = new Uint8Array(tagData.data, offset, len);
      offset += len;

      const config = SPSParser.parseSPS(sps);

      meta.codecWidth = config.codec_size.width;
      meta.codecHeight = config.codec_size.height;
      meta.presentWidth = config.present_size.width;
      meta.presentHeight = config.present_size.height;
      meta.config = config;
      meta.profile = config.profile_string;
      meta.level = config.level_string;
      meta.bitDepth = config.bit_depth;
      meta.chromaFormat = config.chroma_format;
      meta.sarRatio = config.sar_ratio;
      meta.frameRate = config.frame_rate;

      if (
        config.frame_rate.fixed === false ||
        config.frame_rate.fps_num === 0 ||
        config.frame_rate.fps_den === 0
      ) {
        meta.frameRate = this._referenceFrameRate;
      }

      const fps_den = meta.frameRate.fps_den;
      const fps_num = meta.frameRate.fps_num;
      meta.refSampleDuration = Math.floor(meta.timescale * (fps_den / fps_num));

      const codecArray = sps.subarray(1, 4);
      let codecString = 'avc1.';
      for (let j = 0; j < 3; j++) {
        let h = codecArray[j].toString(16);
        if (h.length < 2) {
          h = '0' + h;
        }
        codecString += h;
      }
      meta.codec = codecString;

      const mi = this._mediaInfo;
      mi.width = meta.codecWidth;
      mi.height = meta.codecHeight;
      mi.fps = meta.frameRate.fps;
      mi.profile = meta.profile;
      mi.level = meta.level;
      mi.chromaFormat = config.chroma_format_string;
      mi.sarNum = meta.sarRatio.width;
      mi.sarDen = meta.sarRatio.height;
      mi.videoCodec = codecString;
      mi.meta = meta;
      if (mi.hasAudio) {
        if (mi.audioCodec != null) {
          mi.mimeType =
            'video/x-flv; codecs="' + mi.videoCodec + ',' + mi.audioCodec + '"';
        }
      } else {
        mi.mimeType = 'video/x-flv; codecs="' + mi.videoCodec + '"';
      }

      if (mi.isComplete()) {
        this.emit('mediaInfo', mi);
      }
    }

    const ppsCount = v.getUint8(offset); // numOfPictureParameterSets
    if (ppsCount === 0 || ppsCount > 1) {
      throw Error(`无效的 H264 PPS count: ${ppsCount}`);
    }

    offset++;

    for (let i = 0; i < ppsCount; i++) {
      const len = v.getUint16(offset, false); // pictureParameterSetLength
      offset += 2;

      if (len === 0) {
        continue;
      }

      // pps is useless for extracting video information
      offset += len;
    }

    meta.avcc = new Uint8Array(tagData.data);
    Log.v('AVCDecoderConfigurationRecord解析成功...');

    if (this._isInitialMetadataDispatched()) {
      // flush parsed frames
      if (this._audioTrack.length || this._videoTrack.length) {
        this.emit('availableData', this._audioTrack, this._videoTrack);
      }
    } else {
      this._videoInitialMetadataDispatched = true;
    }

    this.emit('videoMeta', meta);
  }

  /**
   * 解析metadata里的keyframes
   */
  _parseKeyframesIndex(keyframes) {
    const times = [];
    const filepositions = [];

    for (let i = 1; i < keyframes.times.length; i++) {
      const time = this._timestampBase + Math.floor(keyframes.times[i] * 1000);
      times.push(time);
      filepositions.push(keyframes.filepositions[i]);
    }

    return {
      times,
      filepositions
    };
  }

  _isInitialMetadataDispatched() {
    if (this._hasAudio && this._hasVideo) {
      // both audio & video
      return (
        this._audioInitialMetadataDispatched &&
        this._videoInitialMetadataDispatched
      );
    }
    if (this._hasAudio && !this._hasVideo) {
      // audio only
      return this._audioInitialMetadataDispatched;
    }
    if (!this._hasAudio && this._hasVideo) {
      // video only
      return this._videoInitialMetadataDispatched;
    }
  }
}

export default DemuxController;
