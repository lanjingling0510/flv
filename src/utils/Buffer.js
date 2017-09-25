const Buffer {


  /**
   * 拼接buffer
   */
  concat(...bufferlist) {
    const byteLength = bufferlist.map(buffer => buffer.byteLength);
    const tmp = new Uint8Array(byteLength);

    let offset = 0;
    bufferlist.forEach(function(buffer) {
      tmp.set(buffer, offset);
      offset = buffer.byteLength;
    });

    return tmp.buffer;
  }

}



export default Buffer;
