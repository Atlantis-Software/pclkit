var TrueType = require('../font/trueType/trueType');
var fs = require('fs');
var path = require('path');

module.exports = {
  initFonts: function(defaultFont) {
    defaultFont = defaultFont || 'Helvetica';
    // Lookup table for embedded fonts
    this._fontFamilies = {};
    this._fontCount = 0;

    // Font state
    this._fontSize = 12;
    this._font = null;

    this._registeredFonts = {};

    this.registerFont('Courier', path.join(__dirname, '..', 'font', 'data', 'LiberationMono-Regular.ttf'));
    this.registerFont('Courier-Bold', path.join(__dirname, '..', 'font', 'data', 'LiberationMono-Bold.ttf'));
    this.registerFont('Courier-Oblique', path.join(__dirname, '..', 'font', 'data', 'LiberationMono-Italic.ttf'));
    this.registerFont('Courier-BoldOblique', path.join(__dirname, '..', 'font', 'data', 'LiberationMono-BoldItalic.ttf'));
    this.registerFont('Helvetica', path.join(__dirname, '..', 'font', 'data', 'LiberationSans-Regular.ttf'));
    this.registerFont('Helvetica-Bold', path.join(__dirname, '..', 'font', 'data', 'LiberationSans-Bold.ttf'));
    this.registerFont('Helvetica-Oblique', path.join(__dirname, '..', 'font', 'data', 'LiberationSans-Italic.ttf'));
    this.registerFont('Helvetica-BoldOblique', path.join(__dirname, '..', 'font', 'data', 'LiberationSans-BoldItalic.ttf'));
    this.registerFont('Times-Roman', path.join(__dirname, '..', 'font', 'data', 'LiberationSerif-Regular.ttf'));
    this.registerFont('Times-Bold', path.join(__dirname, '..', 'font', 'data', 'LiberationSerif-Bold.ttf'));
    this.registerFont('Times-Italic', path.join(__dirname, '..', 'font', 'data', 'LiberationSerif-Italic.ttf'));
    this.registerFont('Times-BoldItalic', path.join(__dirname, '..', 'font', 'data', 'LiberationSerif-BoldItalic.ttf'));
    // this.registerFont('Symbol', '../font/data/???.ttf');
    // this.registerFont('ZapfDingbats', '../font/data/itczapfdingbats.ttf');

    // Set the default font
    if (defaultFont) {
      this.font(defaultFont);
    }
  },

  font: function(src, family, size) {
    if (typeof family === 'number') {
      size = family;
      family = null;
    }

    var cacheKey = null;

    if (typeof src === 'string') {
      cacheKey = src;
      // check registered fonts if src is a string
      if (this._registeredFonts[src]) {
        ({ src, family } = this._registeredFonts[src]);
      } else {
        src = fs.readFileSync(src);
      }
    }

    if (typeof family === 'string') {
      cacheKey = cacheKey || family;
    }
    
    if (size != null) {
      this.fontSize(size);
    }
    
    if (this._fontFamilies[cacheKey]) {
      this._font = this._fontFamilies[cacheKey];
      return this;
    }

    var id = ++this._fontCount;

    // TODO detect font type (only ttf is supported for now
    this._font = new TrueType(this, id, src, family);

    if (cacheKey) {
      this._fontFamilies[cacheKey] = this._font;
    }

    this.page.fonts.push(this._font);

    return this;
  },

  fontSize: function(_fontSize) {
    this._fontSize = _fontSize;
    return this;
  },

  /*_fontSize: function(size) {
    this._writePCL('\x1b(s' + size + 'V');
    return this;
  },*/

  registerFont: function(name, src, family) {

    if (typeof src === 'string') {
      src = fs.readFileSync(src);
    }

    this._registeredFonts[name] = {
      src,
      family
    };

    return this;
  }
};

