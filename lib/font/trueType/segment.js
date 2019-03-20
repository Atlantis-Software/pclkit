var segment = function(font) {
  this._parsedFont = font._parsed;
  this._fontBuffer = font._buffer;

  // Segment Identifier UInt16
  // Each entry in the Segmented Font Data Section has its own unique identification number.
  // Value Mnemonic Data Segment
  // 17219 CC       Character Complement
  // 17232 CP       Copyright
  // 18260 GT       Global TrueType Data
  // 18758 IF       Intellifont Face Data
  // 20545 PA       PANOSE Description
  // 22618 XW       XWindows Font Name
  // 65535          Null Segment
  this.identifier = 0;

  // Segment Size UInt16
  // the number of bytes in the immediately following Data Segment.
  this.size = 0;

  this.data = null;
};

// Panose Segment
// This data segment of variable length may be used for the purpose of font selection and substitution.
segment.prototype.Panose = function() {
  this.id = 20545;
  // A 10-field (10-byte) version sufficient for the description of most Latin fonts
  // appears under the OS/2 table in True Type Font Files.
  this.size = 10;
  this.data = Buffer.alloc(10);
  var panose = this._parsedFont['OS/2'].panose;
  for (var i = 0; i < 10; i++) {
    this.data.writeUInt8(panose[i], i);
  }

  return this;
};

// Global TrueType Segment
// Every TrueType font needs to have this segment
segment.prototype.GlobalTrueType = function() {
  this.id = 18260;

  // 2 or 4 bytes of offset and 2 bytes of length per glyph
  //var offset = 4 + 2 * this._parsedFont.maxp.numGlyphs;
  var offset = 0;

  var tables = [];

  var self = this;
  var addTable = function(tag) {
   var table = self._parsedFont.directory.tables[tag];
   if (table) {
     var t = {
       tag: tag, 
       checksum: table.checkSum,
       offset: offset,
       size: table.length,
       padding: table.length % 4,
       data: self._fontBuffer.slice(table.offset, table.offset + table.length)
     };
     tables.push(t);
     offset += t.size + t.padding;
    }
  };

  // The Table Directory is organized in alphabetical order by the 4-byte table names
  addTable('cvt '); // should not appear in unhinted fonts
  addTable('fpgm'); // should not appear in unhinted fonts

  // the gdir table should have a size of 0 and an offset of 0
  tables.push({
    tag: 'gdir',
    checksum: 0,
    offset: 0,
    size: 0,
    data: Buffer.alloc(0)
  });

  addTable('head');
  addTable('hhea');
  addTable('hmtx');
  addTable('maxp');
  addTable('prep'); // should not appear in unhinted fonts
  addTable('vhea');
  addTable('vmtx');

  // The Table Directory has a 12-byte header and 16 bytes per entry in the Table Directory
  var directorySize = 12 + tables.length * 16;

  var segementData = Buffer.alloc(directorySize + offset);


  var largestPowerOf2 = function(n) {
    return Math.pow(2, Math.floor(Math.log(n) / Math.log(2)));
  };

  // Directory
  // scaler type: A tag to indicate the OFA scaler to be used to rasterize this font
  segementData.write(this._parsedFont.directory.tag, 0);

  // numTables: number of tables
  var numTables = tables.length;
  segementData.writeUInt16BE(numTables, 4);

  // searchRange: (maximum power of 2 <= numTables)*16
  var numTablesLargestPowerOf2 = largestPowerOf2(numTables);
  var searchRange = numTablesLargestPowerOf2 * 16;
  segementData.writeUInt16BE(searchRange, 6);

  // entrySelector: log2(maximum power of 2 <= numTables)
  segementData.writeUInt16BE(Math.log2(numTablesLargestPowerOf2), 8);

  // rangeShift: numTables*16-searchRange
  segementData.writeUInt16BE(numTables * 16 - searchRange, 10);

  // The table directory
  var pos = 12;
  tables.forEach(function(table) {
    // tag:	4-byte identifier
    segementData.write(table.tag, pos);

    // checkSum:	checksum for this table
    segementData.writeUInt32BE(table.checksum, pos + 4);

    // offset:	offset from beginning of sfnt
    // scale table offset up by Directory size
    if (table.tag !== 'gdir') {
      table.offset += directorySize;
    }
    segementData.writeUInt32BE(table.offset, pos + 8);

    // length:	length of this table in byte (actual length not padded length)
    segementData.writeUInt32BE(table.data.length, pos + 12);

    // write table data
    table.data.copy(segementData, table.offset, 0, table.data.length);

    // add 16 bytes to pos for next table
    pos += 16;
  });

  this.size = segementData.length;
  this.data = segementData;

  return this;
};

// Null Segment
// The Segmented Font Data section is terminated by the Null Segment.
segment.prototype.Null = function() {
  this.id = 65535;
  // The size for the Null Segment is 0.
  this.size = 0;
  this.data = Buffer.alloc(0);

  return this;
};

segment.prototype.toBuffer = function() {
  var buffer = Buffer.alloc(this.size + 4);
  buffer.writeUInt16BE(this.id, 0);
  buffer.writeUInt16BE(this.size, 2);
  this.data.copy(buffer, 4, 0, this.data.length);
  return buffer;
};

module.exports = segment;

