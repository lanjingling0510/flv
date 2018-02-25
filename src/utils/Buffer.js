import ieee754 from 'ieee754';


const Buffer = {
  /**
   * 拼接buffer
   */
  concat(...bufferlist) {
    const byteLength = bufferlist.reduce((sum, buf) => sum + buf.byteLength, 0);
    const tmp = new Uint8Array(byteLength);

    let offset = 0;
    bufferlist.forEach(buffer => {
      tmp.set(buffer, offset);
      offset = buffer.byteLength;
    });

    return tmp.buffer;
  },

  /**
   * 读取32位大端字节序
   */
  readUInt32BE(buffer, offset) {
    return new DataView(buffer, offset).getInt32(0, false);
  },

  /**
   * 读取24位大端字节序
   */
  readUInt24BE(buffer, offset) {
    const arr = new Uint8Array(buffer);
    return (arr[offset] << 16) | (arr[offset + 1] << 8) | arr[offset + 2];
  },

  /**
   * 读取16位大端字节序
   */
  readUInt16BE(buffer, offset) {
    return new DataView(buffer, offset).getInt16(0, false);
  },

  /**
   * 读取1字节
   */
  readUInt8(buffer, offset) {
    const arr = new Uint8Array(buffer);
    return arr[offset];
  },

  /**
   * 读取双精度浮点数
   */
  readDoubleBE(buffer, offset) {
    return ieee754.read(new Uint8Array(buffer), offset, false, 52, 8);
  },

  /**
   * 转化成字符串
   */
  readToString(buffer) {
    const uintArray = new Uint8Array(buffer);
    const encodedString = String.fromCharCode(...uintArray);
    const decodedString = decodeURIComponent(escape(encodedString));
    return decodedString;
  }
};

export default Buffer;
