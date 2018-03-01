import EventEmitter from './utils/EventEmitter';
import MediaSegmentInfoList from './remux/MediaSegmentInfoList';
import MediaSegmentInfo from './remux/MediaSegmentInfo';
import SampleInfo from './remux/SampleInfo';
import MP4 from './remux/MP4';
import AAC from './remux/AAC';
import Browser from './utils/browser';

class RemuxController extends EventEmitter {
  constructor(config) {
    super();
    this._config = config;
    this._isLive = (config.isLive === true) ? true : false;

    this._audioMeta = null;
    this._videoMeta = null;

    this._dtsBase = -1;
    this._dtsBaseInited = false;
    this._audioDtsBase = Infinity;
    this._videoDtsBase = Infinity;
    this._audioNextDts = undefined;
    this._videoNextDts = undefined;

    this._audioSegmentInfoList = new MediaSegmentInfoList('audio');
    this._videoSegmentInfoList = new MediaSegmentInfoList('video');

    // Workaround for chrome < 50: Always force first sample as a Random Access Point in media segment
    // see https://bugs.chromium.org/p/chromium/issues/detail?id=229412
    this._forceFirstIDR =
      Browser.chrome &&
      (Browser.version.major < 50 ||
        (Browser.version.major === 50 && Browser.version.build < 2661))
        ? true
        : false;

    // Workaround for IE11/Edge: Fill silent aac frame after keyframe-seeking
    // Make audio beginDts equals with video beginDts, in order to fix seek freeze
    this._fillSilentAfterSeek = Browser.msedge || Browser.msie;

    // While only FireFox supports 'audio/mp4, codecs="mp3"', use 'audio/mpeg' for chrome, safari, ...
    this._mp3UseMpegAudio = !Browser.firefox;
  }

  generateInitSegment(meta) {
    if (meta.constructor != Array) {
      meta = [meta];
    }

    const ftyp = MP4.ftyp();
    const moov = MP4.moov(meta);

    const result = new Uint8Array(ftyp.byteLength + moov.byteLength);
    result.set(ftyp, 0);
    result.set(moov, ftyp.byteLength);
    return result;
  }

  remux(audioTrack, videoTrack) {
    if (!this._dtsBaseInited) {
      this._calculateDtsBase(audioTrack, videoTrack);
    }

    this._remuxVideo(videoTrack);
    this._remuxAudio(audioTrack);
  }

  _calculateDtsBase(audioTrack, videoTrack) {
    if (this._dtsBaseInited) {
      return;
    }

    if (audioTrack.samples && audioTrack.samples.length) {
      this._audioDtsBase = audioTrack.samples[0].dts;
    }
    if (videoTrack.samples && videoTrack.samples.length) {
      this._videoDtsBase = videoTrack.samples[0].dts;
    }

    this._dtsBase = Math.min(this._audioDtsBase, this._videoDtsBase);
    this._dtsBaseInited = true;
  }

  _remuxVideo(videoTrack) {
    if (this._videoMeta == null) {
      return;
    }

    let track = videoTrack;
    let samples = track.samples;
    let dtsCorrection = undefined;
    let firstDts = -1,
      lastDts = -1;
    let firstPts = -1,
      lastPts = -1;

    if (!samples || samples.length <= 1) {
      return;
    }

    // 第一个dts
    let firstSampleOriginalDts = samples[0].dts - this._dtsBase;

    // 计算dtsCorrection
    if (this._videoNextDts) {
      dtsCorrection = Math.max(firstSampleOriginalDts - this._videoNextDts, 0);
    } else {
      // this._videoNextDts == undefined
      if (this._videoSegmentInfoList.isEmpty()) {
        dtsCorrection = 0;
      } else {
        let lastSample = this._videoSegmentInfoList.getLastSampleBefore(
          firstSampleOriginalDts
        );

        if (lastSample != null) {
          let distance =
            firstSampleOriginalDts -
            (lastSample.originalDts + lastSample.duration);

          if (distance <= 3) {
            distance = 0;
          }

          let expectedDts = lastSample.dts + lastSample.duration + distance;
          dtsCorrection = firstSampleOriginalDts - expectedDts;
        } else {
          // lastSample == null, cannot found
          dtsCorrection = 0;
        }
      }
    }

    let info = new MediaSegmentInfo();
    let mp4Samples = [];
    let firstFrameDtsCorrection = dtsCorrection;
    dtsCorrection = 0;

    // Correct dts for each sample, and calculate sample duration. Then output to mp4Samples
    for (let i = 0; i + 1 < samples.length; i++) {
      let sample = samples[i];
      let originalDts =
        sample.dts - this._dtsBase - (i == 0 ? firstFrameDtsCorrection : 0);
      let isKeyframe = sample.isKeyframe;
      let dts = originalDts - dtsCorrection;
      let cts = sample.cts;
      let pts = dts + cts;

      if (firstDts === -1) {
        firstDts = dts;
        firstPts = pts;
      }

      let sampleDuration = 0;

      if (i !== samples.length - 1) {
        let nextDts = samples[i + 1].dts - this._dtsBase - dtsCorrection;
        sampleDuration = nextDts - dts;
      } else {
        // the last sample
        if (mp4Samples.length >= 1) {
          // use second last sample duration
          sampleDuration = mp4Samples[mp4Samples.length - 1].duration;
        } else {
          // the only one sample, use reference sample duration
          sampleDuration = Math.floor(this._videoMeta.refSampleDuration);
        }
      }

      if (isKeyframe) {
        let syncPoint = new SampleInfo(
          dts,
          pts,
          sampleDuration,
          sample.dts,
          true
        );
        syncPoint.fileposition = sample.fileposition;
        info.appendSyncPoint(syncPoint);
      }

      mp4Samples.push({
        dts: dts,
        pts: pts,
        cts: cts,
        units: sample.units,
        size: sample.length,
        isKeyframe: isKeyframe,
        duration: sampleDuration,
        originalDts: originalDts,
        flags: {
          isLeading: 0,
          dependsOn: isKeyframe ? 2 : 1,
          isDependedOn: isKeyframe ? 1 : 0,
          hasRedundancy: 0,
          isNonSync: isKeyframe ? 0 : 1
        }
      });
    }

    let offset = 8;
    let mdatBytes = 8; // + videoTrack.length;
    for (let i = 0; i < mp4Samples.length; ++i) {
      mdatBytes += mp4Samples[i].size;
    }
    let mdatbox = new Uint8Array(mdatBytes);
    mdatbox[0] = (mdatBytes >>> 24) & 0xff;
    mdatbox[1] = (mdatBytes >>> 16) & 0xff;
    mdatbox[2] = (mdatBytes >>> 8) & 0xff;
    mdatbox[3] = mdatBytes & 0xff;
    mdatbox.set(MP4.types.mdat, 4);
    // Write samples into mdatbox
    for (let i = 0; i < mp4Samples.length; i++) {
      let units = mp4Samples[i].units;
      while (units.length) {
        let unit = units.shift();
        let data = unit.data;
        mdatbox.set(data, offset);
        offset += data.byteLength;
      }
    }

    let latest = mp4Samples[mp4Samples.length - 1];
    lastDts = latest.dts + latest.duration;
    // lastDts = latest.originalDts + latest.duration;
    lastPts = latest.pts + latest.duration;
    this._videoNextDts = lastDts;

    // fill media segment info & add to info list
    info.beginDts = firstDts;
    info.endDts = lastDts;
    info.beginPts = firstPts;
    info.endPts = lastPts;
    info.originalBeginDts = mp4Samples[0].originalDts;
    info.originalEndDts = latest.originalDts + latest.duration;
    info.firstSample = new SampleInfo(
      mp4Samples[0].dts,
      mp4Samples[0].pts,
      mp4Samples[0].duration,
      mp4Samples[0].originalDts,
      mp4Samples[0].isKeyframe
    );

    info.lastSample = new SampleInfo(
      latest.dts,
      latest.pts,
      latest.duration,
      latest.originalDts,
      latest.isKeyframe
    );
    if (!this._isLive) {
      this._videoSegmentInfoList.append(info);
    }

    track.samples = mp4Samples;
    track.sequenceNumber++;
    // track.sequenceNumber += track.addcoefficient;

    // workaround for chrome < 50: force first sample as a random access point
    // see https://bugs.chromium.org/p/chromium/issues/detail?id=229412
    if (this._forceFirstIDR) {
      let flags = mp4Samples[0].flags;
      flags.dependsOn = 2;
      flags.isNonSync = 0;
    }

    let moofbox = MP4.moof(track, firstDts);
    track.samples = [samples[samples.length - 1]];
    track.length = 0;

    const segment = {
      type: 'video',
      data: this._mergeBoxes(moofbox, mdatbox).buffer,
      sampleCount: mp4Samples.length,
      info: info
    };

    this.emit('mediaSegment', segment);
  }

  _remuxAudio(audioTrack) {
    if (this._audioMeta == null) {
      return;
    }

    let track = audioTrack;
    let samples = track.samples;
    let dtsCorrection = undefined;
    let firstDts = -1,
      lastDts = -1,
      lastPts = -1;
    let refSampleDuration = this._audioMeta.refSampleDuration;
    let mpegRawTrack = this._audioMeta.codec === 'mp3' && this._mp3UseMpegAudio;
    let firstSegmentAfterSeek =
      this._dtsBaseInited && this._audioNextDts === undefined;

    let insertPrefixSilentFrame = false;

    if (!samples || samples.length <= 1) {
      return;
    }

    let offset = 0;
    let mdatbox = null;
    let mdatBytes = 0;

    // calculate initial mdat size
    if (mpegRawTrack) {
      // for raw mpeg buffer
      offset = 0;
      mdatBytes = track.length;
    } else {
      // for fmp4 mdat box
      offset = 8; // size + type
      mdatBytes = 8 + track.length;
    }

    let firstSampleOriginalDts = samples[0].dts - this._dtsBase;

    // calculate dtsCorrection
    if (this._audioNextDts) {
      dtsCorrection = firstSampleOriginalDts - this._audioNextDts;
    } else {
      // this._audioNextDts == undefined
      if (this._audioSegmentInfoList.isEmpty()) {
        dtsCorrection = 0;
        if (
          this._fillSilentAfterSeek &&
          !this._videoSegmentInfoList.isEmpty()
        ) {
          if (this._audioMeta.originalCodec !== 'mp3') {
            insertPrefixSilentFrame = true;
          }
        }
      } else {
        let lastSample = this._audioSegmentInfoList.getLastSampleBefore(
          firstSampleOriginalDts
        );
        if (lastSample != null) {
          let distance =
            firstSampleOriginalDts -
            (lastSample.originalDts + lastSample.duration);
          if (distance <= 3) {
            distance = 0;
          }
          let expectedDts = lastSample.dts + lastSample.duration + distance;
          dtsCorrection = firstSampleOriginalDts - expectedDts;
        } else {
          // lastSample == null, cannot found
          dtsCorrection = 0;
        }
      }
    }

    if (insertPrefixSilentFrame) {
      // align audio segment beginDts to match with current video segment's beginDts
      let firstSampleDts = firstSampleOriginalDts - dtsCorrection;
      let videoSegment = this._videoSegmentInfoList.getLastSegmentBefore(
        firstSampleOriginalDts
      );
      if (videoSegment != null && videoSegment.beginDts < firstSampleDts) {
        let silentUnit = AAC.getSilentFrame(
          this._audioMeta.originalCodec,
          this._audioMeta.channelCount
        );

        if (silentUnit) {
          let dts = videoSegment.beginDts;
          let silentFrameDuration = firstSampleDts - videoSegment.beginDts;
          console.log(
            `InsertPrefixSilentAudio: dts: ${dts}, duration: ${silentFrameDuration}`
          );
          samples.unshift({ unit: silentUnit, dts: dts, pts: dts });
          mdatBytes += silentUnit.byteLength;
        } // silentUnit == null: Cannot generate, skip
      } else {
        insertPrefixSilentFrame = false;
      }
    }

    let mp4Samples = [];
    dtsCorrection = 0;

    // Correct dts for each sample, and calculate sample duration. Then output to mp4Samples
    for (let i = 0; i + 1 < samples.length; i++) {
      let sample = samples[i];
      let unit = sample.unit;
      let originalDts = sample.dts - this._dtsBase;
      let dts = originalDts - dtsCorrection;

      if (firstDts === -1) {
        firstDts = dts;
      }

      let sampleDuration = 0;

      if (i !== samples.length - 1) {
        let nextDts = samples[i + 1].dts - this._dtsBase - dtsCorrection;
        sampleDuration = nextDts - dts;
      } else {
        // the last sample
        if (mp4Samples.length >= 1) {
          // use second last sample duration
          sampleDuration = mp4Samples[mp4Samples.length - 1].duration;
        } else {
          // the only one sample, use reference sample duration
          sampleDuration = Math.floor(refSampleDuration);
        }
      }

      let needFillSilentFrames = false;
      let silentFrames = null;

      mp4Samples.push({
        dts: dts,
        pts: dts,
        cts: 0,
        unit: sample.unit,
        size: sample.unit.byteLength,
        duration: sampleDuration,
        originalDts: originalDts,
        flags: {
          isLeading: 0,
          dependsOn: 1,
          isDependedOn: 0,
          hasRedundancy: 0
        }
      });

      if (needFillSilentFrames) {
        // Silent frames should be inserted after wrong-duration frame
        mp4Samples.push.apply(mp4Samples, silentFrames);
      }
    }

    // allocate mdatbox
    if (mpegRawTrack) {
      // allocate for raw mpeg buffer
      mdatbox = new Uint8Array(mdatBytes);
    } else {
      // allocate for fmp4 mdat box
      let offset = 8;
      let mdatBytes = 8; // + videoTrack.length;
      for (let i = 0; i < mp4Samples.length; ++i) {
        mdatBytes += mp4Samples[i].size;
      }

      mdatbox = new Uint8Array(mdatBytes);
      // size field
      mdatbox[0] = (mdatBytes >>> 24) & 0xff;
      mdatbox[1] = (mdatBytes >>> 16) & 0xff;
      mdatbox[2] = (mdatBytes >>> 8) & 0xff;
      mdatbox[3] = mdatBytes & 0xff;
      // type field (fourCC)
      mdatbox.set(MP4.types.mdat, 4);
    }

    // Write samples into mdatbox
    for (let i = 0; i < mp4Samples.length; i++) {
      let unit = mp4Samples[i].unit;
      mdatbox.set(unit, offset);
      offset += unit.byteLength;
    }

    let latest = mp4Samples[mp4Samples.length - 1];
    lastDts = latest.dts + latest.duration;
    // console.log(latest.dts,latest.originalDts);
    // lastDts = latest.originalDts + latest.duration;
    this._audioNextDts = lastDts;
    // console.log('dtsCorrection',dtsCorrection,'firstSampleOriginalDts',firstSampleOriginalDts,'_dtsBase',this._dtsBase,'this._audioNextDts',this._audioNextDts,'latest.dts',latest.dts,latest.originalDts)

    // fill media segment info & add to info list
    let info = new MediaSegmentInfo();
    info.beginDts = firstDts;
    info.endDts = lastDts;
    info.beginPts = firstDts;
    info.endPts = lastDts;
    info.originalBeginDts = mp4Samples[0].originalDts;
    info.originalEndDts = latest.originalDts + latest.duration;
    info.firstSample = new SampleInfo(
      mp4Samples[0].dts,
      mp4Samples[0].pts,
      mp4Samples[0].duration,
      mp4Samples[0].originalDts,
      false
    );
    info.lastSample = new SampleInfo(
      latest.dts,
      latest.pts,
      latest.duration,
      latest.originalDts,
      false
    );
    if (!this._isLive) {
      this._audioSegmentInfoList.append(info);
    }

    track.samples = mp4Samples;
    track.sequenceNumber++;
    // track.sequenceNumber += track.addcoefficient;
    let moofbox = null;

    if (mpegRawTrack) {
      // Generate empty buffer, because useless for raw mpeg
      moofbox = new Uint8Array();
    } else {
      // Generate moof for fmp4 segment
      moofbox = MP4.moof(track, firstDts);
    }

    track.samples = [samples[samples.length - 1]];
    track.length = 0;

    let segment = {
      type: 'audio',
      data: this._mergeBoxes(moofbox, mdatbox).buffer,
      sampleCount: mp4Samples.length,
      info: info
    };

    if (mpegRawTrack && firstSegmentAfterSeek) {
      // For MPEG audio stream in MSE, if seeking occurred, before appending new buffer
      // We need explicitly set timestampOffset to the desired point in timeline for mpeg SourceBuffer.
      segment.timestampOffset = firstDts;
    }

    this.emit('mediaSegment', segment);
  }

  _mergeBoxes(moof, mdat) {
    let result = new Uint8Array(moof.byteLength + mdat.byteLength);
    result.set(moof, 0);
    result.set(mdat, moof.byteLength);
    return result;
  }
}

export default RemuxController;
