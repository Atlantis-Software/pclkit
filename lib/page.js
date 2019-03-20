const DEFAULT_MARGINS = {
  top: 72,
  left: 72,
  bottom: 72,
  right: 72
};

const SIZES = {
  '4A0': [4767.87, 6740.79],
  '2A0': [3370.39, 4767.87],
  A0: [2383.94, 3370.39],
  A1: [1683.78, 2383.94],
  A2: [1190.55, 1683.78],
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  A6: [297.64, 419.53],
  A7: [209.76, 297.64],
  A8: [147.4, 209.76],
  A9: [104.88, 147.4],
  A10: [73.7, 104.88],
  B0: [2834.65, 4008.19],
  B1: [2004.09, 2834.65],
  B2: [1417.32, 2004.09],
  B3: [1000.63, 1417.32],
  B4: [708.66, 1000.63],
  B5: [498.9, 708.66],
  B6: [354.33, 498.9],
  B7: [249.45, 354.33],
  B8: [175.75, 249.45],
  B9: [124.72, 175.75],
  B10: [87.87, 124.72],
  C0: [2599.37, 3676.54],
  C1: [1836.85, 2599.37],
  C2: [1298.27, 1836.85],
  C3: [918.43, 1298.27],
  C4: [649.13, 918.43],
  C5: [459.21, 649.13],
  C6: [323.15, 459.21],
  C7: [229.61, 323.15],
  C8: [161.57, 229.61],
  C9: [113.39, 161.57],
  C10: [79.37, 113.39],
  RA0: [2437.8, 3458.27],
  RA1: [1729.13, 2437.8],
  RA2: [1218.9, 1729.13],
  RA3: [864.57, 1218.9],
  RA4: [609.45, 864.57],
  SRA0: [2551.18, 3628.35],
  SRA1: [1814.17, 2551.18],
  SRA2: [1275.59, 1814.17],
  SRA3: [907.09, 1275.59],
  SRA4: [637.8, 907.09],
  EXECUTIVE: [521.86, 756.0],
  FOLIO: [612.0, 936.0],
  LEGAL: [612.0, 1008.0],
  LETTER: [612.0, 792.0],
  TABLOID: [792.0, 1224.0]
};


var page = function(document, options) {
  this.document = document;
  this.size = options.size || 'letter';
  this.layout = options.layout || 'portrait';
  this.fonts = [];
  this.content = [];

  // process margins
  if (typeof options.margin === 'number') {
    this.margins = {
      top: options.margin,
      left: options.margin,
      bottom: options.margin,
      right: options.margin
    };

  // default to 1 inch margins
  } else {
    this.margins = options.margins || Object.assign({}, DEFAULT_MARGINS);
  }

  // calculate page dimensions
  const dimensions = Array.isArray(this.size)
    ? this.size
    : SIZES[this.size.toUpperCase()];
  this.width = dimensions[this.layout === 'portrait' ? 0 : 1];
  this.height = dimensions[this.layout === 'portrait' ? 1 : 0];

  this.innerWidth = this.width - this.margins.left - this.margins.right;
  this.innerHeight = this.height - this.margins.top - this.margins.bottom;

  // remove 1/4 inch to left margin
  this.margins.left = this.margins.left - 18;
};

page.prototype.render = function() {
  var self = this;
  // init page size

  // universal reset
  this.document._writePCL('\x1b%-12345X');
  // reset command
  this.document._writePCL('\x1bE');
  // set DPI to 600 dpi
  this.document._writePCL('\x1b&u600D');
  // number of copies
  this.document._writePCL('\x1b&l1X');
  // set feed from source automatic
  this.document._writePCL('\x1b&l7H');
  // set page orientation
  // 0 - Portrait
  // 1 - Landscape
  // 2 - Reverse Portrait
  // 3 - Reverse Landscape
  switch(this.layout) {
    case 'portrait':
      this.document._writePCL('\x1b&l0O');
      break;
    case 'landscape':
      this.document._writePCL('\x1b&l1O');
      break;
  }

  //  page size
  switch(this.size) {
    case 'letter':
      this.document._writePCL('\x1b&l2A');
      break;
  }
  // set margin top to 0
  this.document._writePCL('\x1b&l0E');
  // set text length as 48 lines
  this.document._writePCL('\x1b&l48F');

  // set position (Decipoints)
  this.document._writePCL('\x1b&a' + this.margins.left * 10 + 'h' + this.margins.top * 10 + 'V');

  // initialize all fonts
  this.fonts.forEach(function(font) {
    font.toPCL();
  });

  // init HP/GL2
  // sets the location of the PCL Picture Frame anchor
  // point to the PCL cursor position
  this.document._writePCL('\x1b&a' + this.margins.left * 10 + 'h' + this.margins.top * 10 + 'V');

  // set HP GL Picture frame size in decipoints
  this.document._writePCL('\x1b*c0t' + this.innerWidth * 10 + 'x' + this.innerHeight * 10  + 'Y');

  this.document._writeHPGL('SP1;');     // Select Pen
  // sets HP-GL/2 User unit
  this.document._writeHPGL('SC0,' + this.innerWidth + ',' + this.innerHeight + ',0;');

  this.document._writeHPGL('PA0,0;');   // Specify absolute plotting and move to (0, 0)

  // Display margin
  this.document._writeHPGL('PD0,0,' + this.innerWidth + ',0,' + this.innerWidth + ',' +  this.innerHeight + ',0,' + this.innerHeight + ',0,0;');

  // draw HP/GL2 content stack
  this.content.forEach(function(content) {
    var method = "_" + content.shift();
    self.document[method].apply(self.document, content);
  });
};

module.exports = page;
