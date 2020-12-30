const CONSTANTS = require('./constants');

var page = function(document, options) {
  this.document = document;
  this.size = options.size || 'letter';
  this.layout = options.layout || 'portrait';
  this.fonts = [];
  this.content = [];
  this._eject = false;

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
    this.margins = options.margins || Object.assign({}, CONSTANTS.DEFAULT_MARGINS);
  }

  // calculate page dimensions
  const dimensions = Array.isArray(this.size)
    ? this.size
    : CONSTANTS.SIZES[this.size.toUpperCase()];
  this.width = dimensions[this.layout === 'portrait' ? 0 : 1];
  this.height = dimensions[this.layout === 'portrait' ? 1 : 0];

  this.innerWidth = this.width - this.margins.left - this.margins.right;
  this.innerHeight = this.height - this.margins.top - this.margins.bottom;

  // remove 1/4 inch to left margin
  //this.margins.left = this.margins.left - 18;
};

page.prototype.eject = function() {
  this._eject = true;
};

page.prototype.end = function() {
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
  // this.document._writePCL('\x1b&a' + this.margins.left * 10 + 'h' + this.margins.top * 10 + 'V');
  this.document._writePCL('\x1b&a0h0V');

  // initialize all fonts
  for (var fontId in this.fonts) {
    var font = this.fonts[fontId];
    font.toPCL();
  }

  // init HP/GL2
  // sets the location of the PCL Picture Frame anchor
  // point to the PCL cursor position
  //this.document._writePCL('\x1b&a' + this.margins.left * 10 + 'h' + this.margins.top * 10 + 'V');

  // set HP GL Picture frame size in decipoints
  //this.document._writePCL('\x1b*c0t' + this.innerWidth * 10 + 'x' + this.innerHeight * 10  + 'Y');
  this.document._writePCL('\x1b*c0t' + this.width * 10 + 'x' + this.height * 10  + 'Y');

  this.document._writeHPGL('SP1;');     // Select Pen
  // sets HP-GL/2 User unit
  //this.document._writeHPGL('SC0,' + this.innerWidth + ',' + this.innerHeight + ',0;');
  this.document._writeHPGL('SC0,' + this.width + ',' + this.height + ',0;');

  this.document._writeHPGL('PA0,0;');   // Specify absolute plotting and move to (0, 0)

  // Display margin
  //this.document._writeHPGL('PD0,0,' + this.innerWidth + ',0,' + this.innerWidth + ',' +  this.innerHeight + ',0,' + this.innerHeight + ',0,0;');
  this.document._writeHPGL('PD0,0,' + this.width + ',0,' + this.width + ',' +  this.height + ',0,' + this.height + ',0,0;');

  // draw HP/GL2 content stack
  this.content.forEach(function(content) {
    var method = "_" + content.shift();
    self.document[method].apply(self.document, content);
  });

  if (this._eject) {
    // eject page
    this.document._writePCL('\x1b&l0#H');
  }
};

page.prototype.maxY = function() {
  return this.height - this.margins.bottom;
}

module.exports = page;
