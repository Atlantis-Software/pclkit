var Readable = require('stream').Readable;
var Page = require('./page');
var Color = require('./color');
var trueType = require('./font/trueType');
var fs = require('fs');

var PCL_MODE = 0;
var TEXT_MODE = 1;
var BIN_MODE = 2;
var HPGL_MODE = 3;

function PCL(options) { 
  // Inherit properties
  Readable.call(this, options);
  options = options || {};
  this.mode = PCL_MODE;
  this.page = new Page(options);
  this.vectors = [];
  this.currentPCL = '';
  this._start();
}

// Inherit Readable Stream prototype
PCL.prototype = Object.create(Readable.prototype);
PCL.prototype.constructor = Readable;

// required by node.js
PCL.prototype._read = function() {};

PCL.prototype._writePCL = function(data) {
  if (this.mode === HPGL_MODE) {
    this._closeHPGL();
  }
  if (data.length < 6) {
    // commands could not be conbined
    if (this.currentPCL) {
    this.push(this.currentPCL);
    this.currentPCL = '';
    }
    this.push(data);
  }
  // The first two characters after “\x1b” (the parameterized and group
  // character) must be the same in all of the commands to be combined.
  else if (this.currentPCL.slice(1, 3) === data.slice(1, 3)) {
    // All alphabetic characters within the combined printer command
    // are lower-case, except the final letter which is always upper-case.
    // '\x1b&l1O' + '\x1b&l2A' => '\x1b&l1o2A'
    this.currentPCL = this.currentPCL.toLowerCase() + data.slice(3);
  } else {
    // commands could not be conbined
    this.push(this.currentPCL);
    this.currentPCL = data;
  }
  this.mode = PCL_MODE;
};

PCL.prototype._writeText = function(data) {
  if (this.mode === HPGL_MODE) {
    this._closeHPGL();
  } else if (this.mode === PCL_MODE) {
    this.push(this.currentPCL);
    this.currentPCL = '';
  }
  this.push(data);
  this.mode = TEXT_MODE;
};

PCL.prototype._writeBinary = function(data) {
  if (this.mode === HPGL_MODE) {
    this._closeHPGL();
  } else if (this.mode === PCL_MODE) {
    this.push(this.currentPCL);
    this.currentPCL = '';
  }
  this.push(data);
  this.mode = BIN_MODE;
};

PCL.prototype._writeHPGL = function(data) {
  if (this.mode !== HPGL_MODE) {
    if (this.mode === PCL_MODE) {
      this.push(this.currentPCL);
      this.currentPCL = '';
    }
    this._openHPGL();
  }
  this.push(data);
  this.mode = HPGL_MODE;
};

PCL.prototype._start = function() {
  // universal reset
  this._writePCL('\x1b%-12345X');
  // reset command
  this._writePCL('\x1bE');
  // set DPI to 600 dpi
  this._writePCL('\x1b&u600D');
  // number of copies
  this._writePCL('\x1b&l1X');
  // set feed from source automatic
  this._writePCL('\x1b&l7H');
  // set page orientation
  // 0 - Portrait
  // 1 - Landscape
  // 2 - Reverse Portrait
  // 3 - Reverse Landscape
  switch(this.page.layout) {
    case 'portrait':
      this._writePCL('\x1b&l0O');
      break;
    case 'landscape':
      this._writePCL('\x1b&l1O');
      break;
  }

  //  page size
  switch(this.page.size) {
    case 'letter':
      this._writePCL('\x1b&l2A');
      break;
  }
  // set margin top to 0
  this._writePCL('\x1b&l0E');
  // set text length as 48 lines
  this._writePCL('\x1b&l48F');
  // set position (Decipoints)
  this._writePCL('\x1b&a' + this.page.margins.left * 10 + 'h' + this.page.margins.top * 10 + 'V');
};

PCL.prototype._openHPGL = function() {
  // sets the location of the PCL Picture Frame anchor
  // point to the PCL cursor position
  this.push('\x1b&a' + this.page.margins.left * 10 + 'h' + this.page.margins.top * 10 + 'V');

  // set HP GL Picture frame size in decipoints
  this.push('\x1b*c0t' + this.page.innerWidth * 10 + 'x' + this.page.innerHeight * 10  + 'Y');

  this.push('\x1b%0B');  // Enter HP-GL/2 Mode
  this.push('IN;');      // Initialize HP-GL/2 Mode
  this.push('SP1;');     // Select Pen
  // sets HP-GL/2 User unit
  this.push('SC0,' + this.page.innerWidth + ',0,' + this.page.innerHeight + ';');

  this.push('PA0,0;');   // Specify absolute plotting and move to (0, 0)

  // Display margin
  this.push('PD0,0,' + this.page.innerWidth + ',0,' + this.page.innerWidth + ',' +  this.page.innerHeight + ',0,' + this.page.innerHeight + ',0,0;');
};

PCL.prototype._closeHPGL = function() {
  this.push('\x1b%0A'); // Enter PCL Mode

};

PCL.prototype.font = function(file) {
  var self = this;

  if (typeof file === "string") {
    file = fs.readFileSync(file);
  }

  var font = new trueType(file);
  var softFont = font.toPCL();
  this._writePCL('\x1b*c' + 1 + 'D'); // Assign Font ID Number (identifier = 1)
  this._writePCL('\x1b)s' + softFont.header.length + 'W'); // Download Font Header
  this._writeBinary(softFont.header);
  this._writePCL('\x1b(s' + 25 + 'V'); // Primary Font: Height
  this._writePCL('\x1b(' + 1 + 'X'); // Primary Font: Select by ID (identifier = 1)
  this._writePCL('\x1b&d@'); // Underline Disable

  // Send caracter descriptors
  softFont.characterDescriptors.forEach(function(cd) {
    self._writePCL('\x1b*c' + cd.codePoint + 'E'); // Character Code
    cd.data.forEach(function(data) {
      self._writePCL('\x1b(s' + data.length + 'W'); // Download Character
      self._writeBinary(data);
    });
  });

  return this;
};

PCL.prototype.fontSize = function(size) {
  this._writePCL('\x1b(s' + size + 'V');
  return this;
};

PCL.prototype.text = function(text, x , y) {
  if (typeof x ==='number') {
    x = x + this.page.margins.left;
    // Horizontal Cursor Positioning (Decipoints) Command 
    this._writePCL('\x1b&a' + x * 10 + 'H');
  }
  if (typeof y === 'number') {
    y = y + this.page.margins.top;
    // Vertical Cursor Positioning (Decipoints) Command 
    this._writePCL('\x1b&a' + y * 10 + 'V');
  }
  if (text) {
    this._writeText(text);
  }
  return this;
};

PCL.prototype.image = function() {
  console.warn('.image is not yet implemented');
  return this;
};

PCL.prototype.addPage = function() {
  // eject page
  this._writePCL('\x1b&l0#H');
  return this;
};

PCL.prototype.save = function() {
  console.warn('.save is not yet implemented');
  return this;
};

PCL.prototype.moveTo = function(x, y) {
  this.vectors.push({
    f: 'moveTo',
    x: x,
    y: this.page.innerHeight - y
  });
  return this;
};

PCL.prototype.lineTo = function(x, y) {
  this.vectors.push({
    f: 'lineTo',
    x: x,
    y: this.page.innerHeight - y
  });
  return this;
};

PCL.prototype.fill = function(color) {
  var self = this;
  color = new Color(color);
  self._writeHPGL('PC9,' + color.r + ',' + color.g + ',' + color.b + ';SP9;');
  // polygon mode status
  var PM = false;
  this.vectors.forEach(function(v) {
    switch(v.f) {
      case 'moveTo':
        if (PM) {
          self._writeHPGL('PM2;FP;');
          PM = false;
        }
        self._writeHPGL('PU' + v.x + ',' + v.y + ';');
        break;
      case 'lineTo':
        if (!PM) {
          self._writeHPGL('PM0;');
          PM = true;
        }
        self._writeHPGL('PD' + v.x + ',' + v.y + ';');
        break;
    }
  });
  if (PM) {
    this._writeHPGL('PM2;FP;');
  }
  this._writeHPGL('SP1;');
  this.vectors.length = 0;
  return this;
};

PCL.prototype.stroke = function() {
  var self = this;
  this.vectors.forEach(function(v) {
    switch(v.f) {
      case 'moveTo':
        self._writeHPGL('PU' + v.x + ',' + v.y + ';');
        break;
      case 'lineTo':
        self._writeHPGL('PD' + v.x + ',' + v.y + ';');
        break;
    }
  });
  this.vectors.length = 0;
};

PCL.prototype.scale = function() {
  console.warn('.scale is not yet implemented');
  return this;
};

PCL.prototype.translate = function() {
  console.warn('.translate is not yet implemented');
  return this;
};

PCL.prototype.path = function() {
  console.warn('.path is not yet implemented');
  return this;
};

PCL.prototype.restore = function() {
  console.warn('.restore is not yet implemented');
  return this;
};

PCL.prototype.fillColor = function(color) {
  color = new Color(color);
  // Configure Image Data (CID) Command
  // Byte 0 (Color Space) 02 => Standard RGB (sRGB)
  // Byte 1 (Pixel Encoding Mode) 03 => Direct by Pixel
  // The number of bits per index 08
  // The number of bits in color component 08
  // The number of bits in color component 08
  // The number of bits in color component 08
  this._writePCL('\x1b*v6W\x02\x03\x08\x08\x08\x08');
  // define the color
  this._writePCL('\x1b*v' + color.r + 'A');
  this._writePCL('\x1b*v' + color.g + 'B');
  this._writePCL('\x1b*v' + color.b + 'C');
  // insert in palette index 0
  this._writePCL('\x1b*v0I');
  // select index 0
  this._writePCL('\x1b*v0S');
  return this;
};

PCL.prototype.underline = function() {
  console.warn('.underline is not yet implemented');
  return this;
};

PCL.prototype.link = function() {
  console.warn('.link is not yet implemented');
  return this;
};

PCL.prototype.end = function() {
  // reset command
  this._writePCL('\x1bE');
  this.push(this.currentPCL);
  // end the stream
  this.push(null);
  return this;
};

module.exports = PCL;
