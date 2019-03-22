var Readable = require('stream').Readable;
var Page = require('./page');

var ColorMixin = require('./mixins/color');
var VectorMixin = require('./mixins/vector');
var FontsMixin = require('./mixins/fonts');
var TextMixin = require('./mixins/text');
var ImagesMixin = require('./mixins/images');
var AnnotationsMixin = require('./mixins/annotations');
var OutlineMixin = require('./mixins/outline');

var fs = require('fs');

var PCL_MODE = 0;
var TEXT_MODE = 1;
var BIN_MODE = 2;
var HPGL_MODE = 3;

function PCLDocument(options) { 
  // Inherit properties
  Readable.call(this, options);
  this.options = options || {};
  this.mode = PCL_MODE;

  // Initialize the metadata
  this.info = {
    Producer: 'PCLKit',
    Creator: 'PCLKit',
    CreationDate: new Date()
  };

  if (this.options.info) {
    for (var key in this.options.info) {
      this.info[key] = this.options.info[key];
    }
  }

  this.page = new Page(this, this.options);
  this.currentPCL = '';

  // Initialize mixins
  this.initColor();
  this.initVector();
  this.initFonts(this.options.font);
  this.initText();
  this.initImages();
  this.initOutline();
}

// Inherit Readable Stream prototype
PCLDocument.prototype = Object.create(Readable.prototype);
PCLDocument.prototype.constructor = Readable;

// required by node.js
PCLDocument.prototype._read = function() {};

PCLDocument.prototype._writePCL = function(data) {
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

PCLDocument.prototype._writeText = function(data) {
  if (this.mode === HPGL_MODE) {
    this._closeHPGL();
  } else if (this.mode === PCL_MODE) {
    this.push(this.currentPCL);
    this.currentPCL = '';
  }
  this.push(data);
  this.mode = TEXT_MODE;
};

PCLDocument.prototype._writeBinary = function(data) {
  if (this.mode === HPGL_MODE) {
    this._closeHPGL();
  } else if (this.mode === PCL_MODE) {
    this.push(this.currentPCL);
    this.currentPCL = '';
  }
  this.push(data);
  this.mode = BIN_MODE;
};

PCLDocument.prototype._writeHPGL = function(data) {
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

PCLDocument.prototype._openHPGL = function() {
  this.push('\x1b%0B');  // Enter HP-GL/2 Mode
  this.push('IN;');      // Initialize HP-GL/2 Mode
};

PCLDocument.prototype._closeHPGL = function() {
  this.push('\x1b%0A'); // Enter PCL Mode

};

PCLDocument.prototype.addPage = function(options) {
  options = options || this.options;
  this.page.render();
  // eject page
  this._writePCL('\x1b&l0#H');
  this.page = new Page(this, options);
  this.x = this.page.margins.left;
  this.y = this.page.margins.top;
  this._ctm = [1, 0, 0, 1, 0, 0];
  return this;
};

PCLDocument.prototype.end = function() {
  this.page.render();
  // reset command
  this._writePCL('\x1bE');
  this.push(this.currentPCL);
  // end the stream
  this.push(null);
  return this;
};

var mixin = function(methods) {
  Object.assign(PCLDocument.prototype, methods);
};

mixin(ColorMixin);
mixin(VectorMixin);
mixin(FontsMixin);
mixin(TextMixin);
mixin(ImagesMixin);
mixin(AnnotationsMixin);
mixin(OutlineMixin);

module.exports = PCLDocument;
