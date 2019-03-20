var font = function(document, id, fontBuffer, family) {
  this.document = document;
  this.id = id;
  this._buffer = fontBuffer;
  this.family = family;
  this.size = 12;

  // Font Descriptor Size (Unsigned Integer 0 . . 65535)
  // Specifies the number of bytes in the font descriptor
  this.fontDescriptorSize = 0;

  // Header Format (Unsigned Byte 0 . . 255)
  // The Header Format byte identifies the font to format
  // 0 PCL Bitmap
  // 10 Intellifont Bound Scalable
  // 11 Intellifont Unbound Scalable
  // 15 TrueType Scalable (bound or unbound)
  // 20 Resolution-Specified Bitmap
  this.headerFormat = 0;

  // Font Type (Unsigned Byte 0 . . 255)
  // Font type describes the font’s relation to symbol sets
  // 0  Bound font. Character codes 32 to 127 [decimal] are printable.
  // 1  Bound font. Character codes 32 to 127 [decimal] and 160 to 255 [decimal] are printable.
  // 2  Bound font. All character codes 0 to 255 are printable, except 0, 7 to 15, and 27 [decimal].
  // 10 Unbound font. Character codes correspond to HP MSL numbers (for Intellifont unbound scalable fonts).
  // 11 Unbound font. Character codes correspond to Unicode numbers (for TrueType unbound scalable fonts).
  this.fontType = 0;

  // Style (Unsigned Integer 0 . . 65535)
  // Style Word = Posture + (4 x Width) + (32 x Structure)
  this.style = {
    // Posture:
    // 0 Upright
    // 1 Italic
    // 2 Alternate Italic
    // 3 Reserved
    posture: 0,

    // Appearance Width:
    // 0 Normal
    // 1 Condensed
    // 2 Compressed or Extra Condensed
    // 3 Extra Compressed
    // 4 Ultra Compressed
    // 5 Reserved
    // 6 Extended or Expanded
    // 7 Extra Extended or Extra Expanded
    width: 0,

    // Structure:
    // 0     Solid
    // 1     Outline
    // 2     Inline
    // 3     Contour, Distressed (edge effects)
    // 4     Solid with Shadow
    // 5     Outline with Shadow
    // 6     Inline with Shadow
    // 7     Contour with Shadow
    // 8-11  Patterned (complex patterns, subject to type family)
    // 12-15 Patterned with Shadow
    // 16    Inverse
    // 17    Inverse in Open Border
    // 18-30 Reserved
    // 31    Unknown Structure
    structure: 0
  };

  // Baseline Position (Unsigned Integer 0 . . 65535)
  // Bitmap Font - Specifies the distance from the top of the cell to the baseline(in font resolution dots).
  // Intellifont Scalable - Specifies a Y-coordinate in the design window
  // TrueType Scalable - Baseline Position must be set to zero.
  this.baselinePosition = 0;

  // Cell Width (Unsigned Integer 0 . . 65535)
  // Specifies the width of the cell.
  // The cell must be wide enough to accept the widest character.
  // Bitmap Font - Specified in PCL coordinate system dots.
  // Scalable Font - Specified in design units.
  this.cellWidth = 0;

  // Cell Height (Unsigned Integer 0 . . 65535)
  // Specifies the height of the cell.
  // The design cell for a font must be tall enough to accept the tallest character and greatest descender.
  // Bitmap Font - Specified in PCL coordinate system dots.
  // Scalable Font - Specified in design units.
  this.cellHeight = 0;

  // Orientation (Unsigned Byte 0 . . 255)
  // Specifies the orientation of the font
  // 0 portrait (0 degrees; the orientation of the raster scan of the printer)
  // 1 landscape (90 degrees counterclockwise)
  // 2 reverse portrait (180 degrees counterclockwise)
  // 3 reverse landscape (270 degrees counterclockwise)
  // Bitmap Font - Unsupported values invalidate font creation.
  // Scalable Font - set to zero.
  this.orientation = 0;

  // Spacing (Boolean)
  // Specifies the spacing of the font.
  // 0 fixed spacing
  // 1 proportional spacing
  this.spacing = 0;

  // Symbol Set (Unsigned Integer 0 . . 65535)
  // Specifies the symbol set for the font.
  // Symbol Set ID code = (# * 32) + (ID - 64)
  // # represents the number portion of the ID selection value
  // ID represents the ordinal(decimal) value of the ID character
  // ex: Roman-8 8U => (8 * 32) + (85 - 64) = 277
  // This field must have a value of 56 for a type 10 or 11 font (unbound Intellifont scalable) to be valid
  this.symbolSet = 0;

  // Pitch (Unsigned Integer 0 . . 65535)
  // Pitch defines the default HMI for the font.
  // Bitmap Font - Specifies the pitch of the font in quarter dots.
  // Scalable Fonts - Contains the master design space width (escapement) of the font in design units.
  this.pitch = 0;

  // Height (Unsigned Integer 0 . . 65535)
  // the height characteristic value of the font.
  // Bitmap Font - Specifies the design height of the font in quarter-dots (radix dots).
  // Intellifont Scalable - Specifies the master design height of the font in 1/8 points. A typical value for this field is 2000.
  // TrueType Scalable - Set the Height field to zero.
  this.height = 0;

  // xHeight (Unsigned Integer 0 . . 65535)
  // Bitmap Font - Specifies the height of the lower case “x” in quarter-dots (radix dots).
  // Scalable Fonts - Specifies the distance from the baseline to the lower case “x” height in design units.
  this.xHeight = 0;

  // Width Type (Signed Byte -128 . . 127)
  // Specifies the proportionate width of characters in the font. 
  // -5 Ultra Compressed
  // -4 Extra Compressed
  // -3 Compressed or Extra Condensed
  // -2 Condensed
  //  0 Normal
  //  2 Expanded
  //  3 Extra Expanded
  // Additional width types may be added by HP.
  this.widthType = 0;

  // Stroke Weight (Signed Byte -128 . . 127)
  // Specifies the thickness of the strokes used in designing the font.
  // -7 Ultra Thin
  // -6 Extra Thin
  // -5 Thin
  // -4 Extra Light
  // -3 Light
  // -2 Demi Light
  // -1 Semi Light
  //  0 Medium, Book, or Text
  //  1 Semi Bold
  //  2 Demi Bold
  //  3 Bold
  //  4 Extra Bold
  //  5 Black
  //  6 Extra Black
  //  7 Ultra Black
  this.strokeWeight = 0;

  // Typeface (Unsigned Byte 0 . . 255)
  // Typeface = Typeface Base Value + ( vendor Value * 4096)
  this.typeface = {
    // Vendor Number - Bits 15 - 12. This value is assigned by HP and is between decimal values 0 and 15.
    // 0 Reserved
    // 1 Agfa Division, Miles Inc.
    // 2 Bitstream Inc.
    // 3 Linotype Company
    // 4 The Monotype Corporation plc
    // 5 Adobe Systems Inc.
    // 6-15 (Reserved)
    vendor: 0,
    // Typeface Family Number - Bits 11 - 0 This value is between 0 and 4095. See Appendix C in the PCL 5 Comparison Guide.
    typefaceFamily: 0
  };
  
  // Serif Style (Unsigned Byte 0 . . 255)
  // Specifies one of the following defined serif styles.
  // for bitmap fonts:
  // 0 Sans Serif Square
  // 1 Sans Serif Round
  // 2 Serif Line
  // 3 Serif Triangle
  // 4 Serif Swath
  // 5 Serif Block
  // 6 Serif Bracket
  // 7 Rounded Bracket
  // 8 Flair Serif, Modified Sans
  // 9 Script Nonconnecting
  // 10 Script Joining
  // 11 Script Calligraphic
  // 12 Script Broken Letter
  // 13-63 Reserved
  // for scalable fonts:
  // 64 Sans Serif
  // 128 Serif
  // 192 Reserved
  this.serifStyle = 0;

  // Quality (Unsigned Byte 0 . . 255)
  // This field specifies the quality of the font.
  // 0 Data processing (draft)
  // 1 Near Letter Quality
  // 2 Letter Quality
  this.quality = 0;

  // Placement (Signed Byte -128 . . 127)
  // Placement specifies the position of character patterns relative to the baseline.
  // Scalable Font - Set the Placement field to zero.
  // for bitmap fonts:
  //  1 Superior
  //  0 Normal
  // -1 Inferior
  this.placement = 0;

  // Underline Position (Signed Byte -128 . . 127)
  // Bitmap Font - Specifies the distance from the baseline to the top dot row of the underline in font design dots.
  // Scalable Font - Set Underline Position to zero.
  this.underlinePosition = 0;

  // Underline Thickness (Unsigned Byte 0 . . 255)
  // Specifies the thickness of the underline in font design dots for a bitmap font.
  // Bitmap Font - A bitmap font prints three-dot thick underlines at 300 dpi (six-dot thick at 600 dpi).
  // Scalable Font - Set Underline Thickness to zero.
  this.underlineThickness = 0;

  // Text Height (Unsigned Integer 0 . . 65535)
  // Specifies the font’s optimum inter-line spacing. This value is typically equal to 120% of the height of the font.
  // Bitmap Font - Specified in quarter-dots (radix dots).
  // Scalable Fonts - Specified in design units.
  this.textHeight = 0;

  // Text Width (Unsigned Integer 0 . . 65535)
  // Specifies the font’s average lowercase character width.
  // Bitmap Font - Specified in quarter-dots (radix dots).
  // Scalable Font - Specified in design units.
  this.textWidth = 0;

  // First Code (Unsigned Integer 0 . . 65535) / Last Code (Unsigned Integer 0 . . 65535)
  // First Code specifies the character code of the first printable character in the font.
  // Last Code Bound Font: Specifies the last code in the font. 
  // Last Code Unbound Font: specifies the maximum number of characters that can be downloaded into the font.
  // Font Type First Code../..Last Code
  // 0         32/127
  // 1         32/127 - 160/255
  // 2         0/255
  // 10        Set to 0 (for unbound font)
  // 11        Set to 0 (for unbound font)
  this.firstCode = 0;
  this.lastCode = 0;

  // Pitch Extended (Unsigned Byte 0 . . 255)
  // Bitmap Font - This is an addition to the Pitch field which extends the pitch an extra eight bits.
  // Scalable Font - Set Pitch Extended field to zero.
  this.pitchExtended = 0;

  // Height Extended (Unsigned Byte 0 . . 255)
  // Bitmap Font - This is an addition to the Height field which extends the height an extra eight bits.
  // Scalable Font - Set The Height Extended field to zero.
  this.heightExtended = 0;

  // Cap Height (Unsigned Integer 0 . . 65535)
  // Cap Height is a percentage of the Em of the font
  // Scalable Font - Contains the cap height in design units.
  this.capHeight = 0;

  // Font Number (Unsigned Long Integer 0 . . 232-1)
  this.fontNumber = {
    nativeFormat: 0,
    companyInitial: '',
    vendorFontNumber: 0
  };

  // Font Name 
  // This is a 16 character ASCII field to which you may assign a font name.
  this.fontName = '';

  // X Resolution (Unsigned Integer 0 . . 65535)
  // The X Resolution field is the pixel resolution in the X scan direction at
  // which the font was designed.
  this.xResolution = 0;

  // Y Resolution (Unsigned Integer 0 . . 65535)
  // The Y Resolution field is the pixel resolution in the Y scan direction at
  // which the font was designed.
  this.yResolution = 0;

  // Scale Factor (Unsigned Integer 0 . . 65535)
  // The Scale Factor field indicates the number of design units per Em.
  this.scaleFactor = 0;

  // Master Underline Position  (Signed Integer -32768 . . 32767)
  // The Master Underline Position is the top of the PCL floating underline
  // with respect to the baseline in design units.
  this.masterUnderlinePosition = 0;

  // Master Underline Thickness (Unsigned Integer 0 . . 65535)
  // thickness of the floating underline in design units.
  this.masterUnderlineThickness = 0;

  // Font Scaling Technology (Unsigned Byte 0 . . 255)
  // For scalable fonts, this field species the technology to be used for font scaling.
  // 0 Intellifont
  // 1 TrueType
  this.fontScalingTechnology = 0;

  // Variety (Unsigned Byte 0 . . 255)
  // For TrueType fonts, this field must be set to zero.
  this.variety = 0;

  // OR Threshold (Unsigned Integer 0 . . 65535)
  // Formerly called the “LRE Threshold,” this is the pixel size in design
  // units above which the missing pixel recovery process is switched on
  // in Intellifont scaling and rasterization.
  this.orThreshold = 0;

  // Global Italic Angle (Signed Integer -32768 . . 32767)
  // the tangent of the italic angle times 2^15 (relative to the vertical).
  // Set this field to zero for upright fonts.
  this.globalItalicAngle = 0;

  // Global Intellifont Data Size (Unsigned Integer 0 . . 65535)
  // The Global Intellifont Data Size identifies the size of the Global Intellifont data block.
  this.globalIntellifontDataSize = 0;

  // Global Intellifont Data
  this.globalIntellifontData = 0;

  // Character Complement (Array of Unsigned Byte)
  this.characterComplement = [];

  // Checksum
  this.checksum = 0;

  // Copyright
  // This field contains ASCII data and is optional.
  this.copyright = '';

  // Segmented Font Data (Format 15)
  this.segmentFontData = [];

};

font.prototype.computeStyle = function() {
  var word = Buffer.alloc(2);
  // Style Word = Posture + (4 x Width) + (32 x Structure)
  word.writeUInt16LE(this.style.posture + this.style.width * 4 + this.style.structure * 32, 0);
  return word;
};

font.prototype.computeTypeface = function() {
  var word = Buffer.alloc(2);
  // Typeface = Typeface Base Value + ( vendor Value * 4096)
  word.writeUInt16LE(this.typeface.typefaceFamily + this.typeface.vendor * 4096, 0);
  return word;
};

font.prototype.computeFontNumber = function() {
  var buffer = Buffer.alloc(4);
  var first = this.fontNumber.companyInitial.toUpperCase().charCodeAt(0) || 0;
  if (this.fontNumber.nativeFormat) {
    first += 128;
  }

  buffer.writeUInt8(first, 0);
  var vendorFontNumberHex = this.fontNumber.vendorFontNumber.toString(16);
  buffer.writeUInt8(parseInt(vendorFontNumberHex.slice(-6, -4), 16) || 0, 1);
  buffer.writeUInt8(parseInt(vendorFontNumberHex.slice(-4, -2), 16) || 0, 2);
  buffer.writeUInt8(parseInt(vendorFontNumberHex.slice(-2), 16) || 0, 3);

  return buffer;
};

module.exports = font;
