const CONSTANTS = require('../constants');
var LineWrapper = require('../line_wrapper');

module.exports = {
  initText: function(options) {
    if (typeof options.margin === 'number') {
      this.x = options.margin;
      this.y = options.margin;
    } else if (options.margins && options.margins.left && options.margins.top) {
      this.x = options.margins.left;
      this.y = options.margins.top;
    } else {
      this.x = CONSTANTS.DEFAULT_MARGINS.left;
      this.y = CONSTANTS.DEFAULT_MARGINS.top;
    }

    this._lineGap = 0;
  },

  lineGap: function(_lineGap) {
    this._lineGap = _lineGap;
    return this;
  },

  moveDown: function(lines) {
    if (lines == null) {
      lines = 1;
    }
    this.y += this.currentLineHeight(true) * lines + this._lineGap;
    return this;
  },

  moveUp: function(lines) {
    if (lines == null) {
      lines = 1;
    }
    this.y -= this.currentLineHeight(true) * lines + this._lineGap;
    return this;
  },

  _text: function(text, coord, options) {

    if (options.fillColor && options.strokeColor) {
      this._writeHPGL('PC1,' + options.fillColor[0] + ',' + options.fillColor[1] + ',' + options.fillColor[2] + ';SP1;');
      this._writeHPGL('PC2,' + options.strokeColor[0] + ',' + options.strokeColor[1] + ',' + options.strokeColor[2] + ';');
      this._writeHPGL('CF0,2;');
    } else if (options.strokeColor) {
      this._writeHPGL('PC1,' + options.strokeColor[0] + ',' + options.strokeColor[1] + ',' + options.strokeColor[2] + ';SP1;');
      this._writeHPGL('CF1,1;');
    } else {
      this._writeHPGL('PC1,' + options.fillColor[0] + ',' + options.fillColor[1] + ',' + options.fillColor[2] + ';SP1;');
      this._writeHPGL('CF0,0;');
    }

    this._writeHPGL('SD4,' + options.size + ';');

    if (options.characterSpacing) {
      this._writeHPGL('ES' + characterSpacing + ';');
    } else {
      this._writeHPGL('ES0;');
    }

    this._writeHPGL('DI' + options.run + ',' + options.rise + ';');

    this._writeHPGL('FI' + options.font.id + ';');
    this._writeHPGL('PU' + coord[0] + ',' + coord[1] + ';');
    this._writeHPGL('LB' + text + ';');
  },

  text: function(text, x, y, options) {
    options = this._initOptions(x, y, options);

    // Convert text to a string
    text = text == null ? '' : text + '';

    // if the wordSpacing option is specified, remove multiple consecutive spaces
    if (options.wordSpacing) {
      text = text.replace(/\s{2,}/g, ' ');
    }

    // word wrapping
    if (options.width) {
      let wrapper = this._wrapper;
      if (!wrapper) {
        wrapper = new LineWrapper(this, options);
        wrapper.on('line', this._line.bind(this));
      }

      this._wrapper = options.continued ? wrapper : null;
      this._textOptions = options.continued ? options : null;
      wrapper.wrap(text, options);
      // render paragraphs as single lines
    } else {
      for (var line of text.split('\n')) {
        this._line(line, options);
      }
    }

    return this;
  },

  widthOfString: function(string, options) {
    if (options == null) {
      options = {};
    }
    return (
      this._font.widthOfString(string, this._fontSize, options.features) +
      (options.characterSpacing || 0) * (string.length - 1)
    );
  },

  heightOfString: function(text, options) {
    var x = this.x;
    var y = this.y;

    options = this._initOptions(options);
    options.height = Infinity; // don't break pages

    var lineGap = options.lineGap || this._lineGap || 0;
    this.text(text, this.x, this.y, options, function() {
      return (this.y += this.currentLineHeight(true) + lineGap);
    });

    var height = this.y - y;
    this.x = x;
    this.y = y;

    return height;
  },

  list: function(list, x, y, options, wrapper) {
    var self = this;
    options = this._initOptions(x, y, options);

    var listType = options.listType || 'bullet';
    var unit = Math.round((this._font.ascender / 1000) * this._fontSize);
    var midLine = unit / 2;
    var r = options.bulletRadius || unit / 3;
    var indent =
      options.textIndent || (listType === 'bullet' ? r * 5 : unit * 2);
    var itemIndent =
      options.bulletIndent || (listType === 'bullet' ? r * 8 : unit * 2);

    var level = 1;
    var items = [];
    var levels = [];
    var numbers = [];

    var flatten = function(list) {
      var n = 1;
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (Array.isArray(item)) {
          level++;
          flatten(item);
          level--;
        } else {
          items.push(item);
          levels.push(level);
          if (listType !== 'bullet') {
            numbers.push(n++);
          }
        }
      }
    };

    flatten(list);

    var label = function(n) {
      switch (listType) {
        case 'numbered':
          return `${n}.`;
        case 'lettered':
          var letter = String.fromCharCode(((n - 1) % 26) + 65);
          var times = Math.floor((n - 1) / 26 + 1);
          var text = Array(times + 1).join(letter);
          return `${text}.`;
      }
    };

    wrapper = new LineWrapper(this, options);
    wrapper.on('line', this._line.bind(this));

    level = 1;
    var i = 0;
    wrapper.on('firstLine', function() {
      var l;
      if ((l = levels[i++]) !== level) {
        var diff = itemIndent * (l - level);
        self.x += diff;
        wrapper.lineWidth -= diff;
        level = l;
      }

      switch (listType) {
        case 'bullet':
          self.circle(self.x - indent + r, self.y + midLine, r);
          return self.fill();
        case 'numbered':
        case 'lettered':
          var text = label(numbers[i - 1]);
          return self._fragment(text, self.x - indent, self.y, options);
      }
    });

    wrapper.on('sectionStart', function() {
      var pos = indent + itemIndent * (level - 1);
      self.x += pos;
      return (wrapper.lineWidth -= pos);
    });

    wrapper.on('sectionEnd', function() {
      var pos = indent + itemIndent * (level - 1);
      self.x -= pos;
      return (wrapper.lineWidth += pos);
    });

    wrapper.wrap(items.join('\n'), options);

    return this;
  },

  _initOptions: function(x, y, options) {
    if (x == null) {
      x = {};
    }
    if (options == null) {
      options = {};
    }
    if (typeof x === 'object') {
      options = x;
      x = null;
    }

    // clone options object
    var result = Object.assign({}, options);

    // extend options with previous values for continued text
    if (this._textOptions) {
      for (var key in this._textOptions) {
        var val = this._textOptions[key];
        if (key !== 'continued') {
          if (result[key] == null) {
            result[key] = val;
          }
        }
      }
    }

    if (x != null) {
      this.x = x;
    }
    if (y != null) {
      this.y = y;
    }
    

    // wrap to margins if no x or y position passed
    if (result.lineBreak !== false) {
      if (result.width == null) {
        result.width = this.page.width - this.x - this.page.margins.right;
      }
    }

    if (!result.columns) {
      result.columns = 0;
    }
    if (result.columnGap == null) {
      result.columnGap = 18;
    } // 1/4 inch

    return result;
  },

  _line: function(text, options, wrapper) {
    if (options == null) {
      options = {};
    }
    this._fragment(text, this.x, this.y, options);
    var lineGap = options.lineGap || this._lineGap || 0;

    if (!wrapper) {
      return (this.x += this.widthOfString(text));
    } else {
      return (this.y += this.currentLineHeight(true) + lineGap);
    }
  },

  _fragment: function(text, x, y, options) {
    var dy, encoded, i, positions, textWidth, words;
    text = `${text}`.replace(/\n/g, '');
    if (text.length === 0) {
      return;
    }

    // handle options
    var align = options.align || 'left';
    var wordSpacing = options.wordSpacing || 0;
    var characterSpacing = options.characterSpacing || 0;

    // text alignments
    if (options.width) {
      switch (align) {
        case 'right':
          textWidth = this.widthOfString(text.replace(/\s+$/, ''), options);
          x += options.lineWidth - textWidth;
          break;

        case 'center':
          x += options.lineWidth / 2 - options.textWidth / 2;
          break;

        case 'justify':
          // calculate the word spacing value
          words = text.trim().split(/\s+/);
          textWidth = this.widthOfString(text.replace(/\s+/g, ''), options);
          var spaceWidth = this.widthOfString(' ') + characterSpacing;
          wordSpacing = Math.max(
            0,
            (options.lineWidth - textWidth) / Math.max(1, words.length - 1) -
              spaceWidth
          );
          break;
      }
    }

    // text baseline alignments based on http://wiki.apache.org/xmlgraphics-fop/LineLayout/AlignmentHandling
    if (typeof options.baseline === 'number') {
      dy = -options.baseline;
    } else {
      switch (options.baseline) {
        case 'svg-middle':
          dy = 0.5 * this._font.xHeight;
          break;
        case 'middle':
        case 'svg-central':
          dy = 0.5 * (this._font.descender + this._font.ascender);
          break;
        case 'bottom':
        case 'ideographic':
          dy = this._font.descender;
          break;
        case 'alphabetic':
          dy = 0;
          break;
        case 'mathematical':
          dy = 0.5 * this._font.ascender;
          break;
        case 'hanging':
          dy = 0.8 * this._font.ascender;
          break;
        case 'top':
          dy = this._font.ascender;
          break;
        default:
          dy = this._font.ascender;
      }
      dy = (dy / 1000) * this._fontSize;
    }

    // calculate the actual rendered width of the string after word and character spacing
    var renderedWidth =
      options.textWidth +
      wordSpacing * (options.wordCount - 1) +
      characterSpacing * (text.length - 1);

    // create link annotations if the link option is given
    if (options.link != null) {
      this.link(x, y, renderedWidth, this.currentLineHeight(), options.link);
    }

    // create underline or strikethrough line
    if (options.underline || options.strike) {
      this.save();
      if (!options.stroke) {
        this.strokeColor(...(this._fillColor || []));
      }

      var lineWidth =
        this._fontSize < 10 ? 0.5 : Math.floor(this._fontSize / 10);
      this.lineWidth(lineWidth);

      var d = options.underline ? 1 : 2;
      var lineY = y + this.currentLineHeight() / d;
      if (options.underline) {
        lineY -= lineWidth;
      }

      this.moveTo(x, lineY);
      this.lineTo(x + renderedWidth, lineY);
      this.stroke();
      this.restore();
    }

    this.save();

    // oblique (angle in degrees or boolean)
    if (options.oblique) {
      var skew;
      if (typeof options.oblique === 'number') {
        skew = -Math.tan((options.oblique * Math.PI) / 180);
      } else {
        skew = -0.25;
      }
      this.transform(1, 0, 0, 1, x, y);
      this.transform(1, 0, skew, 1, -skew * dy, 0);
      this.transform(1, 0, 0, 1, -x, -y);
    }

    // flip coordinate system
    this.transform(1, 0, 0, -1, 0, this.page.height);
    y = this.page.height - y - dy;

    // add current font to page if necessary
    if (this.page.fonts[this._font.id] == null) {
      this.page.fonts[this._font.id] = this._font;
    }

    // begin the text object
    var txtOpts = {};

    // text position
    var Xtext = x;
    var Ytext = y;

    // font and font size
    txtOpts.font = this._font;
    txtOpts.size = this._fontSize;

    // rotation
    var rotationRad = Math.atan2(this._ctm[1], this._ctm[0]);
    var rotationDeg = rotationRad * 180 / Math.PI;
    txtOpts.run = Math.cos(-rotationRad);
    txtOpts.rise = Math.sin(-rotationRad);
    
    // rendering mode
    if (options.fill && options.stroke) {
      txtOpts.fillColor = this._fillColor;
      txtOpts.strokeColor = this._strokeColor;
    } else if (options.stroke) {
      txtOpts.strokeColor = this._strokeColor;
    } else {
      txtOpts.fillColor = this._fillColor;
    }

    // Character spacing
    if (characterSpacing) {
      txtOpts.characterSpacing = characterSpacing;
    }

    // Add the actual text
    // If we have a word spacing value, we need to encode each word separately
    // since the normal Tw operator only works on character code 32, which isn't
    // used for embedded fonts.
    if (wordSpacing) {
      words = text.trim().split(/\s+/);
      wordSpacing += this.widthOfString(' ') + characterSpacing;
      wordSpacing *= 1000 / this._fontSize;

      encoded = [];
      positions = [];
      for (var word of words) {
        var [encodedWord, positionsWord] = this._font.encode(
          word,
          options.features
        );
        encoded = encoded.concat(encodedWord);
        positions = positions.concat(positionsWord);

        // add the word spacing to the end of the word
        // clone object because of cache
        var space = {};
        var object = positions[positions.length - 1];
        for (var key in object) {
          var val = object[key];
          space[key] = val;
        }
        space.xAdvance += wordSpacing;
        positions[positions.length - 1] = space;
      }
    } else {
      [encoded, positions] = this._font.encode(text, options.features);
    }

    var scale = this._fontSize / 1000;
    var commands = [];
    var last = 0;
    var hadOffset = false;

    // Adds a segment of text to the TJ command buffer
    var addSegment = function(cur) {
      if (last < cur) {
        var text = encoded.slice(last, cur).join('');
        var advance =
          positions[cur - 1].xAdvance - positions[cur - 1].advanceWidth;
        commands.push({text, advance});
      }

      return (last = cur);
    };

    var self = this;
    // Flushes the current TJ commands to the output stream
    var flush = function(i) {
      addSegment(i);

      if (commands.length > 0) {
        commands.forEach(function(command) {
          self.page.content.push(['text', command.text + '\x03', self._normalizeCoord(Xtext, Ytext), txtOpts]);
          Xtext += self.widthOfString(command.text) + (command.advance * scale);
        });
        return (commands.length = 0);
      }
    };
    for (i = 0; i < positions.length; i++) {
      // If we have an x or y offset, we have to break out of the current TJ command
      // so we can move the text position.
      var pos = positions[i];
      if (pos.xOffset || pos.yOffset) {
        // Flush the current buffer
        flush(i);
        // Move the text position and flush just the current character
        Xtext = x + pos.xOffset * scale;
        Ytext = y + pos.yOffset * scale;

        flush(i + 1);

        hadOffset = true;
      } else {
        // If the last character had an offset, reset the text position
        if (hadOffset) {
          Xtext = x;
          Ytext = y;

          hadOffset = false;
        }
        // Group segments that don't have any advance adjustments
        if (pos.xAdvance - pos.advanceWidth !== 0) {
          addSegment(i + 1);
        }
      }
      x += pos.xAdvance * scale;
    }
    // Flush any remaining commands
    flush(i);

    // restore flipped coordinate system
    return this.restore();
  }
};

