var EventEmitter = require('events');
var LineBreaker = require('linebreak');

var LineWrapper = function(document, options) {
  var self = this;
  // Inherit properties
  EventEmitter.call(this);

  this.document = document;
  this.indent = options.indent || 0;
  this.characterSpacing = options.characterSpacing || 0;
  this.wordSpacing = options.wordSpacing === 0;
  this.columns = options.columns || 1;
  this.columnGap = options.columnGap != null ? options.columnGap : 18; // 1/4 inch
  this.lineWidth =
    (options.width - this.columnGap * (this.columns - 1)) / this.columns;
  this.spaceLeft = this.lineWidth;
  this.startX = this.document.x;
  this.startY = this.document.y;
  this.column = 1;
  this.ellipsis = options.ellipsis;
  this.continuedX = 0;
  this.features = options.features;

  // calculate the maximum Y position the text can appear at
  if (options.height != null) {
    this.height = options.height;
    this.maxY = this.startY + options.height;
  } else {
    this.maxY = this.document.page.maxY();
  }

  // handle paragraph indents
  this.on('firstLine', function(options) {
    // if this is the first line of the text segment, and
    // we're continuing where we left off, indent that much
    // otherwise use the user specified indent option
    var indent = self.continuedX || self.indent;
    self.document.x += indent;
    self.lineWidth -= indent;

    return self.once('line', function() {
      self.document.x -= indent;
      self.lineWidth += indent;
      if (options.continued && !self.continuedX) {
        self.continuedX = self.indent;
      }
      if (!options.continued) {
        return (self.continuedX = 0);
      }
    });
  });

  // handle left aligning last lines of paragraphs
  this.on('lastLine', function(options) {
    var { align } = options;
    if (align === 'justify') {
      options.align = 'left';
    }
    self.lastLine = true;

    return self.once('line', function() {
      self.document.y += options.paragraphGap || 0;
      options.align = align;
      return (self.lastLine = false);
    });
  });
};

// Inherit EventEmitter prototype
LineWrapper.prototype = Object.create(EventEmitter.prototype);
LineWrapper.prototype.constructor = EventEmitter;
    

LineWrapper.prototype.wordWidth = function(word) {
  return (
    this.document.widthOfString(word, this) +
    this.characterSpacing +
    this.wordSpacing
  );
};

LineWrapper.prototype.eachWord = function(text, fn) {
  // setup a unicode line breaker
  var bk;
  var breaker = new LineBreaker(text);
  var last = null;
  var wordWidths = Object.create(null);

  while ((bk = breaker.nextBreak())) {
    var shouldContinue;
    var word = text.slice(
      (last != null ? last.position : undefined) || 0,
      bk.position
    );
    var w =
      wordWidths[word] != null
        ? wordWidths[word]
        : (wordWidths[word] = this.wordWidth(word));

    // if the word is longer than the whole line, chop it up
    // TODO: break by grapheme clusters, not JS string characters
    if (w > this.lineWidth + this.continuedX) {
      // make some fake break objects
      var lbk = last;
      var fbk = {};

      while (word.length) {
        // fit as much of the word as possible into the space we have
        var l, mightGrow;
        if (w > this.spaceLeft) {
          // start our check at the end of our available space - this method is faster than a loop of each character and it resolves
          // an issue with long loops when processing massive words, such as a huge number of spaces
          l = Math.ceil(this.spaceLeft / (w / word.length));
          w = this.wordWidth(word.slice(0, l));
          mightGrow = w <= this.spaceLeft && l < word.length;
        } else {
          l = word.length;
        }
        var mustShrink = w > this.spaceLeft && l > 0;
        // shrink or grow word as necessary after our near-guess above
        while (mustShrink || mightGrow) {
          if (mustShrink) {
            w = this.wordWidth(word.slice(0, --l));
            mustShrink = w > this.spaceLeft && l > 0;
          } else {
            w = this.wordWidth(word.slice(0, ++l));
            mustShrink = w > this.spaceLeft && l > 0;
            mightGrow = w <= this.spaceLeft && l < word.length;
          }
        }

        // send a required break unless this is the last piece and a linebreak is not specified
        fbk.required = bk.required || l < word.length;
        shouldContinue = fn(word.slice(0, l), w, fbk, lbk);
        lbk = { required: false };

        // get the remaining piece of the word
        word = word.slice(l);
        w = this.wordWidth(word);

        if (shouldContinue === false) {
          break;
        }
      }
    } else {
      // otherwise just emit the break as it was given to us
      shouldContinue = fn(word, w, bk, last);
    }

    if (shouldContinue === false) {
      break;
    }
    last = bk;
  }
}

LineWrapper.prototype.wrap = function(text, options) {
  var self = this;
  // override options from previous continued fragments
  if (options.indent != null) {
    this.indent = options.indent;
  }
  if (options.characterSpacing != null) {
    this.characterSpacing = options.characterSpacing;
  }
  if (options.wordSpacing != null) {
    this.wordSpacing = options.wordSpacing;
  }
  if (options.ellipsis != null) {
    this.ellipsis = options.ellipsis;
  }

  // make sure we're actually on the page
  // and that the first line of is never by
  // itself at the bottom of a page (orphans)
  var nextY = this.document.y + this.document.currentLineHeight(true);
  if (this.document.y > this.maxY || nextY > this.maxY) {
    this.nextSection();
  }

  var buffer = '';
  var textWidth = 0;
  var wc = 0;
  var lc = 0;

  var { y } = this.document; // used to reset Y pos if options.continued (below)
  var emitLine = function() {
    options.textWidth = textWidth + self.wordSpacing * (wc - 1);
    options.wordCount = wc;
    options.lineWidth = self.lineWidth;
    ({ y } = self.document);
    self.emit('line', buffer, options, self);
    return lc++;
  };

  this.emit('sectionStart', options, this);

  this.eachWord(text, function(word, w, bk, last) {
    if (last == null || last.required) {
      self.emit('firstLine', options, self);
      self.spaceLeft = self.lineWidth;
    }

    if (w <= self.spaceLeft) {
      buffer += word;
      textWidth += w;
      wc++;
    }

    if (bk.required || w > self.spaceLeft) {
      // if the user specified a max height and an ellipsis, and is about to pass the
      // max height and max columns after the next line, append the ellipsis
      var lh = self.document.currentLineHeight(true);
      if (
        self.height != null &&
        self.ellipsis &&
        self.document.y + lh * 2 > self.maxY &&
        self.column >= self.columns
      ) {
        if (self.ellipsis === true) {
          self.ellipsis = '…';
        } // map default ellipsis character
        buffer = buffer.replace(/\s+$/, '');
        textWidth = self.wordWidth(buffer + self.ellipsis);

        // remove characters from the buffer until the ellipsis fits
        // to avoid inifinite loop need to stop while-loop if buffer is empty string
        while (buffer && textWidth > self.lineWidth) {
          buffer = buffer.slice(0, -1).replace(/\s+$/, '');
          textWidth = self.wordWidth(buffer + self.ellipsis);
        }
        // need to add ellipsis only if there is enough space for it
        if (textWidth <= self.lineWidth) {
          buffer = buffer + self.ellipsis;
        }

        textWidth = self.wordWidth(buffer);
      }

      if (bk.required) {
        if (w > self.spaceLeft) {
          emitLine();
          buffer = word;
          textWidth = w;
          wc = 1;
        }

        self.emit('lastLine', options, self);
      }

      emitLine();

      // if we've reached the edge of the page,
      // continue on a new page or column
      if (self.document.y + lh > self.maxY) {
        var shouldContinue = self.nextSection();

        // stop if we reached the maximum height
        if (!shouldContinue) {
          wc = 0;
          buffer = '';
          return false;
        }
      }

      // reset the space left and buffer
      if (bk.required) {
        self.spaceLeft = self.lineWidth;
        buffer = '';
        textWidth = 0;
        return (wc = 0);
      } else {
        // reset the space left and buffer
        self.spaceLeft = self.lineWidth - w;
        buffer = word;
        textWidth = w;
        return (wc = 1);
      }
    } else {
      return (self.spaceLeft -= w);
    }
  });

  if (wc > 0) {
    this.emit('lastLine', options, this);
    emitLine();
  }

  this.emit('sectionEnd', options, this);

  // if the wrap is set to be continued, save the X position
  // to start the first line of the next segment at, and reset
  // the y position
  if (options.continued === true) {
    if (lc > 1) {
      this.continuedX = 0;
    }
    this.continuedX += options.textWidth || 0;
    return (this.document.y = y);
  } else {
    return (this.document.x = this.startX);
  }
}

LineWrapper.prototype.nextSection = function(options) {
  this.emit('sectionEnd', options, this);

  if (++this.column > this.columns) {
    // if a max height was specified by the user, we're done.
    // otherwise, the default is to make a new page at the bottom.
    if (this.height != null) {
      return false;
    }

    this.document.addPage();
    this.column = 1;
    this.startY = this.document.page.margins.top;
    this.maxY = this.document.page.maxY();
    this.document.x = this.startX;
    if (this.document._fillColor) {
      this.document.fillColor(...(this.document._fillColor || []));
    }
    this.emit('pageBreak', options, this);
  } else {
    this.document.x += this.lineWidth + this.columnGap;
    this.document.y = this.startY;
    this.emit('columnBreak', options, this);
  }

  this.emit('sectionStart', options, this);
  return true;
}

module.exports = LineWrapper;
