var characterDescriptor = function(glyphID, glyphData) {

  // Format
  // specifies the format for character downloading
  //  4 LaserJet Family (Raster)
  // 10 Intellifont Scalable
  // 15 TrueType Scalable
  this.format = 15;

  // Descriptor Size
  // specifies the size of the character descriptor in bytes
  this.descriptorSize = 2;

  // Class
  // This field is used to distinguish different character data types within a given character format
  //  1 Bitmap
  //  2 Compressed Bitmap
  //  3 Contour (Intellifont Scalable)
  //  4 Compound Contour (Intellifont Scalable)
  // 15 TrueType Scalable
  this.class = 15;

  // Character Data Size
  // = 2(Character Data Size) + 2(Glyph ID) + glyphData.length
  this.characterDataSize = 4 + glyphData.length;

  // Glyph ID
  // ID number for the glyph data associated with the given character
  this.glyphID = glyphID;

  // TrueType Glyph Data
  // data segment associated with the given character as found in the glyf table
  this.glyphData = glyphData;
};

characterDescriptor.prototype.toBuffers = function() {
  var buffer = Buffer.alloc(this.glyphData.length + 10);
  buffer.writeUInt8(this.format, 0);
  // Continuation
  buffer.writeInt8(0, 1);
  buffer.writeUInt8(this.descriptorSize, 2);
  buffer.writeUInt8(this.class, 3);
  buffer.writeUInt16BE(this.characterDataSize, 4);
  buffer.writeUInt16BE(this.glyphID, 6);
  this.glyphData.copy(buffer, 8, 0, this.glyphData.length);
  // Checksum
  // sum of all of the bytes in the Character Data Size, Glyph ID, and TrueType Glyph Data fields,
  // should equal 0 in modulo 256 arithmetic
  var sum = 0;
  for (var i = 4; i < buffer.length - 2; i++) {
    sum += buffer.readUInt8(i);
  }
  var checksum = 256 - (sum % 256);
  if (checksum === 256) {
    checksum = 0;
  }
  buffer.writeUInt8(checksum, buffer.length - 1);

  //  Character Definition command is limited to 32767 bytes
  if (buffer.length > 32767) {
    var buffers = [];
    buffers.push(buffer.slice(0, 32767));
    var pos = 32767;
    var chunk;
    var head = Buffer.alloc(2);
    head.writeUInt8(this.format, 0);
    // Continuation
    head.writeUInt8(1, 1);
    while (pos < buffer.length) {
      if ( (pos + 32765) < buffer.length ) {
        chunk = buffer.slice(pos, pos + 32765);
      } else {
        chunk = buffer.slice(pos, buffer.length);
      }
      pos += 32765;
      buffers.push(Buffer.concat([head, chunk]));
    }
    return buffers;
  } else {
    return [buffer];
  }
};

module.exports = characterDescriptor;
