var fontkit = require('fontkit');
var Font = require('../font');
var Segment = require('./segment');
var CharacterDescriptor = require('./characterDescriptor');

var trueType = function(document, id, fontBuffer, family) {
  // Inherit properties
  Font.call(this, document, id, fontBuffer, family);
  var self = this;

  this._parsed = fontkit.create(fontBuffer);

  this.fontDescriptorSize = 72;
  this.headerFormat = 15;
  this.fontType = 2;

  // Style
  if (this._parsed['OS/2']) {
    var fsSelection = this._parsed['OS/2'].fsSelection;

    // Posture
    if (fsSelection.regular) {
      this.style.posture = 0; // Upright
    } else if (fsSelection.italic) {
      this.style.posture = 1; // Italic
    } else if (fsSelection.oblique) {
      this.style.posture = 2; // Alternate Italic
    } else {
      this.style.posture = 0; // Upright
    }

    // Width
    switch(this._parsed['OS/2'].usWidthClass) {
      // Ultra-condensed
      case 1:
        this.style.width = 4;
        break;
      // Extra-condensed
      case 2:
        this.style.width = 3;
        break;
      // Condensed
      case 3:
        this.style.width = 2;
        break;
      // Semi-condensed
      case 4:
        this.style.width = 1;
        break;
      // Medium (normal)
      case 5:
        this.style.width = 0;
        break;
      // Semi-expanded
      case 6:
      // Expanded
      case 7:
        this.style.width = 6;
        break;
      // Extra-expanded
      case 8:
      // Ultra-expanded
      case 9:
        this.style.width = 7;
        break;
    }

    // Structure
    if (fsSelection.outlined) {
      this.style.structure = 1; // Outline
    } else {
      this.style.structure = 0; // Solid
    }

  } else {
    this.style = {
      posture: 0,
      width: 0,
      structure: 0
    };
  }

  this.baselinePosition = 0;
  this.cellWidth = this._parsed.head.xMax - this._parsed.head.xMin;
  this.cellHeight = this._parsed.head.yMax - this._parsed.head.yMin;
  this.orientation = 0;

  //  Spacing
  // 0 (Fixed-Pitch) if the appropriate Monospaced flag is set in the OS/2.panose classification fields
  // 1 (Proportionally-Spaced) otherwise
  this.spacing = 1;

  if (this._parsed['OS/2'] && this._parsed['OS/2'].panose[3] === 9) {
    this.spacing = 0;
  }

  // Symbol Set Type
  // 2 (Bound 8-bit) usually
  // other value as required
  if (this._parsed.PCLT) {
    this.symbolSet = this._parsed.PCLT.symbolSet;
  } else {
    this.symbolSet = 277;
  }

  // Pitch
  // PCLT.Pitch if PCLT table present;
  // advance width for space character (codePoint 0x20) otherwise.
  // this.pitch
  if (this._parsed.PCLT) {
    this.pitch = this._parsed.PCLT.pitch
  } else {
    this.pitch = this._parsed.glyphForCodePoint(0x20).advanceWidth;
  }

  this.height = 0;

  //  x-Height
  // PCLT.xHeight if PCLT table present
  // OS/2.sxHeight otherwise
  if (this._parsed.PCLT) {
    this.xHeight = this._parsed.PCLT.xHeight;
  } else if (this._parsed['OS/2'] && this._parsed['OS/2'].xHeight) {
    this.xHeight = this._parsed['OS/2'].xHeight;
  } else {
    // calulate x height
    var xBbox = this._parsed.glyphForCodePoint(0x78).bbox;
    this.xHeight = xBbox.maxY - xBbox.minY;
  }

  // Width Type
  // PCLT.WidthType if PCLT table present
  // OS/2.usWidthClass otherwise (modified as there is not a 1:1 mapping)
  if (this._parsed.PCLT) {
    this.widthType = this._parsed.PCLT.widthType;
  } else if (this._parsed['OS/2']) {
    switch(this._parsed['OS/2'].usWidthClass) {
      // Ultra-condensed
      case 1:
        this.widthType = -5;
        break;
      // Extra-condensed
      case 2:
        this.widthType = -4;
        break;
      // Condensed
      case 3:
      // Semi-condensed
      case 4:
        this.widthType = -2;
        break;
      // Medium (normal)
      case 5:
        this.widthType = 0;
        break;
      // Semi-expanded
      case 6:
      // Expanded
      case 7:
        this.widthType = 2;
        break;
      // Extra-expanded
      case 8:
      // Ultra-expanded
      case 9:
        this.widthType = 3;
        break;
    }
  } else {
    this.widthType = 0;
  }

  // Stroke Weight
  // PCLT.StrokeWeight if PCLT table present
  // OS/2.usWeightClass otherwise (modified as there is not  a 1:1 mapping)
  if (this._parsed.PCLT) {
    this.strokeWeight = this._parsed.PCLT.strokeWeight;
  } else if (this._parsed['OS/2']) {
    this.strokeWeight = Math.round(this._parsed['OS/2'].usWeightClass * (14 / 1000) - 7)
  } else {
    this.strokeWeight = 0;
  }

  // Serif Style
  // PCLT.SerifStyle if PCLT table present
  // 0 as default(?) otherwise
  // this.serifStyle
  if (this._parsed.PCLT) {
    this.serifStyle = this._parsed.PCLT.serifStyle;
  } else if (this._parsed['OS/2']) {
    // 64 Sans Serif
    // 128 Serif
    this.serifStyle = this._parsed['OS/2'].sFamilyClass === 8 ? 64 : 128;
  } else {
    this.serifStyle = 64;
  }

  this.quality = 2;
  this.placement = 0;
  this.underlinePosition = 0;
  this.underlineThickness = 0;

  // Text Height
  // hhea.yAscender – hhea.yDescender + hhea.yLineGap
  this.textHeight = this._parsed.hhea.ascent - this._parsed.hhea.descent + this._parsed.hhea.lineGap;

  // Text Width
  // OS/2.xAvgCharWidth
  if (this._parsed['OS/2']) {
    this.textWidth = this._parsed['OS/2'].xAvgCharWidth;
  } else {
    // compute char width average
    var sum = 0;
    var count = 0;

    this._parsed.characterSet.forEach(function(codePoint) {
      if (codePoint === 0xffff || codePoint < self.firstCode || codePoint > self.lastCode) {
        return;
      }
      sum += self._parsed.glyphForCodePoint(0x20).advanceWidth;
      count++;
    });

    this.textWidth = Math.round(sum / count);
  }

  // First Code
  // 0x0020 for Symbol Set Type 2 usually(?)
  // other value for specific font
  this.firstCode = 0x0020;

  // Last Code
  // 0x00ff for Symbol Set Type 2 usually(?)
  // other value for specific font
  this.lastCode = 0x00ff;

  this.pitchExtended = 0;
  this.heightExtended = 0;

  // Cap Height
  // PCLT.CapHeight if PCLT table present
  // OS/2.sCapHeight otherwise
  // this.capHeight
  if (this._parsed.PCLT) {
    this.capHeight = this._parsed.PCLT.capHeight;
  } else if (this._parsed['OS/2'] && this._parsed['OS/2'].capHeight) {
    this.capHeight = this._parsed['OS/2'].capHeight;
  } else {
    // calulate H height
    var HBbox = this._parsed.glyphForCodePoint(0x48).bbox;
    this.capHeight = HBbox.maxY - HBbox.minY;
  }

  // Font Number
  // PCLT.FontNumber if PCLT table present
  // 0 otherwise
  if (this._parsed.PCLT) {
    this.fontNumber = this._parsed.PCLT.fontNumber;
  } else {
    //this.fontNumber = 0;
  }

  // Font Name
  // PCLT.Typeface if PCLT table present
  // name.ID4 (for language = 0x0409) otherwise; value is usually (Big-Endian) Unicode, so must be converted to ANSI
  if (this._parsed.PCLT) {
    this.fontName = this._parsed.PCLT.typeface.toString('ascii');
  } else {
    this.fontName = this._parsed.fullName.toString('ascii');
  }

  // Scale Factor
  // head.unitsPerEm
  this.scaleFactor = this._parsed.head.unitsPerEm;

  // Master Underline Position
  // -(head.unitsPerEm * 20%)
  this.masterUnderlinePosition = -(this._parsed.head.unitsPerEm * 0.2);

  // Master Underline Thickness
  // (head.unitsPerEm * 5%)
  this.masterUnderlineThickness = this._parsed.head.unitsPerEm * 0.05;

  this.fontScalingTechnology = 1;
  this.variety = 0;

  if (this._parsed['OS/2']) {
    this.PanoseSegment = (new Segment(this)).Panose();
  } else {
    this.PanoseSegment = null;
  }
  this.GlobalTrueTypeSegment = (new Segment(this)).GlobalTrueType();
  this.NullSegment = (new Segment(this)).Null();
};

// Inherit Readable Stream prototype
trueType.prototype = Object.create(Font.prototype);
trueType.prototype.constructor = Font;

trueType.prototype.getHeader = function() {
  var style = this.computeStyle();
  var typeface = this.computeTypeface();
  var fontNumber = this.computeFontNumber();

  var header = Buffer.alloc(72);
  header.writeUInt16BE(this.fontDescriptorSize, 0);
  header.writeUInt8(this.headerFormat, 2);
  header.writeUInt8(this.fontType, 3);
  // style MSB
  style.copy(header, 4, 0, 1);
  header.writeUInt16BE(this.baselinePosition, 6);
  header.writeUInt16BE(this.cellWidth, 8);
  header.writeUInt16BE(this.cellHeight, 10);
  header.writeUInt8(this.orientation, 12);
  header.writeUInt8(this.spacing, 13);
  header.writeUInt16BE(this.symbolSet, 14);
  header.writeUInt16BE(this.pitch, 16);
  header.writeUInt16BE(this.height, 18);
  header.writeUInt16BE(this.xHeight, 20);
  header.writeInt8(this.widthType, 22);
  // style LSB
  style.copy(header, 23, 1, 2);
  header.writeInt8(this.strokeWeight, 24);
  // typeface LSB
  typeface.copy(header, 25, 1, 2);
  // typeface MSB
  typeface.copy(header, 26, 0, 1);
  header.writeUInt8(this.serifStyle, 27);
  header.writeUInt8(this.quality, 28);
  header.writeInt8(this.placement, 29);
  header.writeInt8(this.underlinePosition , 30);
  header.writeInt8(this.underlineThickness, 31);
  header.writeUInt16BE(this.textHeight, 32);
  header.writeUInt16BE(this.textWidth, 34);
  header.writeUInt16BE(this.firstCode, 36);
  header.writeUInt16BE(this.lastCode, 38);
  header.writeUInt8(this.pitchExtended, 40);
  header.writeUInt8(this.heightExtended, 41);
  header.writeUInt16BE(this.capHeight, 42);
  fontNumber.copy(header, 44, 0, 4);
  header.write(this.fontName, 48, 'ascii');
  header.writeUInt16BE(this.scaleFactor, 64);
  header.writeInt16BE(this.masterUnderlinePosition, 66);
  header.writeInt16BE(this.masterUnderlineThickness, 68);
  header.writeUInt8(this.fontScalingTechnology, 70);
  header.writeUInt8(this.variety, 71);
  
  if (this.PanoseSegment) {
    header = Buffer.concat([header, this.PanoseSegment.toBuffer(), this.GlobalTrueTypeSegment.toBuffer(), this.NullSegment.toBuffer(), Buffer.alloc(2)]);
  } else {
    header = Buffer.concat([header, this.GlobalTrueTypeSegment.toBuffer(), this.NullSegment.toBuffer(), Buffer.alloc(2)]);
  }

  // CheckSum
  // The value of this byte, when added to the sum of all of the bytes from byte 64 of the descriptor
  // through the Reserved byte, should equal 0 in modulo 256 arithmetic
  var sum = 0;
  for (var i = 64; i < header.length - 2; i++) {
    sum += header.readUInt8(i);
  }
  this.checksum = 256 - (sum % 256);
  header.writeUInt8(this.checksum, header.length - 1);

  return header;
};

trueType.prototype.toPCL = function() {
  var self = this;
  var header = this.getHeader();
  var characterDescriptors = [];
  // get glyf table
  var glyfDir = this._parsed.directory.tables.glyf;
  var glyf = this._buffer.slice(glyfDir.offset, glyfDir.offset + glyfDir.length);
  var self = this;

  this._parsed.characterSet.forEach(function(codePoint) {
    if (codePoint === 0xffff || codePoint < this.firstCode || codePoint > this.lastCode) {
      return;
    }
    var glyphID = self._parsed._cmapProcessor.lookup(codePoint);
    var offset = self._parsed.loca.offsets[glyphID];
    var end = self._parsed.loca.offsets[glyphID + 1];
    if (typeof end === "undefined") {
      end = glyf.length;
    }

    characterDescriptors.push({
      codePoint: codePoint,
      data: (new CharacterDescriptor(glyphID, glyf.slice(offset, end))).toBuffers()
    });
  });

  this.document._writePCL('\x1b*c' + this.id + 'D');        // Assign Font ID Number
  this.document._writePCL('\x1b)s' + header.length + 'W');  // Download Font Header
  this.document._writeBinary(header);
  this.document._writePCL('\x1b(s' + this.size + 'V');      // Primary Font: Height (11 points)
  this.document._writePCL('\x1b(' + this.id + 'X');         // Primary Font: Select by ID
  this.document._writePCL('\x1b&d@');                       // Underline Disable
  characterDescriptors.forEach(function(cd) {
    self.document._writePCL('\x1b*c' + cd.codePoint + 'E');   // Character Code
    cd.data.forEach(function(block) {
      self.document._writePCL('\x1b(s' + block.length + 'W'); // Download Character
      self.document._writeBinary(block);
    });
  });
};

module.exports = trueType;
