export default {
  isLive: true,
  debug: true, // 是否开启debug模式
  autoCleanupSourceBuffer: true, // 是否自动清除 sourcebuffer
  autoCleanupMaxBackwardDuration: 30, // 清除sourcebuffer最大时间
  autoCleanupMinBackwardDuration: 30, // 清除sourcebuffer最小时间
  stashSize: 1024 * 384, // io缓存大小 直播下建议设置成 1024 * 128
  seekType: 'range'// seek请求的方式 是range 还是 query
};
