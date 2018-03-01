// Represents an media sample (audio / video)
class SampleInfo {
  constructor(dts, pts, duration, originalDts, isSync) {
    this.dts = dts;
    this.pts = pts;
    this.duration = duration;
    this.originalDts = originalDts;
    this.isSyncPoint = isSync;
    this.fileposition = null;
  }
}

export default SampleInfo;
