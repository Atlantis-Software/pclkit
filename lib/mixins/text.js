module.exports = {
  initText: function() {
    this.x = 0;
    this.y = 0;
    this._lineGap = 0;
  },
  _text: function(text, coord, options) {
    this._writeHPGL('PC1,' + options.color[0] + ',' + options.color[1] + ',' + options.color[2] + ';SP1;');
    this._writeHPGL('SD4,' + options.size + ';');
    this._writeHPGL('FI' + options.font.id + ';');
    this._writeHPGL('PU' + coord[0] + ',' + coord[1] + ';');
    this._writeHPGL('LB' + text + ';');
  },
  text: function(text, x, y, options) {
    var coord = this._normalizeCoord(x, y);
    options = options || {};
    options.font = options.font || this._font;
    options.size = options.size || this._fontSize;
    options.color = options.color || this._fillColor[0];
    options.opacity = options.opacity || this._fillColor[1];
    this.page.content.push(['text', text + '\x03', coord, options]);
    return this;
  },
  moveDown: function(lines) {
    if (lines == null) {
      lines = 1;
    }
    console.warn('.moveDown is not yet implemented');
    // this.y += this.currentLineHeight(true) * lines + this._lineGap;
    return this;
  },

  moveUp: function(lines) {
    if (lines == null) {
      lines = 1;
    }
    console.warn('.moveUp is not yet implemented');
    // this.y -= this.currentLineHeight(true) * lines + this._lineGap;
    return this;
  },

  list: function(list, x, y, options, wrapper) {
    console.warn('.list is not yet implemented');
    return this;
  }
};

