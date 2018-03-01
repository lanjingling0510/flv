
// Media Segment concept is defined in Media Source Extensions spec.
// Particularly in ISO BMFF format, an Media Segment contains a moof box followed by a mdat box.
class MediaSegmentInfo {
  constructor() {
    this.beginDts = 0;
    this.endDts = 0;
    this.beginPts = 0;
    this.endPts = 0;
    this.originalBeginDts = 0;
    this.originalEndDts = 0;
    this.syncPoints = []; // SampleInfo[n], for video IDR frames only
    this.firstSample = null; // SampleInfo
    this.lastSample = null; // SampleInfo
  }

  appendSyncPoint(sampleInfo) {
    // also called Random Access Point
    sampleInfo.isSyncPoint = true;
    this.syncPoints.push(sampleInfo);
  }
}

export default MediaSegmentInfo;
