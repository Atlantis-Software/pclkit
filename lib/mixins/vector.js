var SVGPath = require('../path');

// This constant is used to approximate a symmetrical arc using a cubic
// Bezier curve.
var KAPPA = 4.0 * ((Math.sqrt(2) - 1.0) / 3.0);

module.exports = {
  initVector: function() {
    this._vectors = [];
    this._lineWidth = 0.3;
    this._ctm = [1, 0, 0, 1, 0, 0];
    this._ctmStack = [];
    this._lastMove = [0,0];

    this._pos = [0, 0];
  },

  _normalizeCoord: function(x, y) {
    x = x || 0;
    y = y || 0;

    // apply transformations
    var m11 = this._ctm[0];
    var m12 = this._ctm[1];
    var m21 = this._ctm[2];
    var m22 = this._ctm[3];
    var m31 = this._ctm[4];
    var m32 = this._ctm[5];

    x = m11 * x + m21 * y + m31;
    y = m12 * x + m22 * y + m32;

    //y = this.Ymax - y;
    return [x, y];
  },

  save: function() {
    this._ctmStack.push(this._ctm.slice());
    return this;
  },

  restore: function() {
    this._ctm = this._ctmStack.pop() || [1, 0, 0, 1, 0, 0];
    this.transform(1, 0, 0, 1, 0, 0);
    return this;
  },

  closePath: function() {
    return this.lineTo(this._lastMove[0], this._lastMove[1]);
  },

  lineWidth: function(w) {
    // HP/GL line width is in millimeter
    this._lineWidth = w * 0.3;
    return this;
  },

  _CAP_STYLES: {
    BUTT: 1,
    SQUARE: 2,
    TRIANGULAR: 3,
    ROUND: 4
  },

  _lineCap: function(c) {
    this._writeHPGL('LA1,' + c + ';');
  },

  lineCap: function(c) {
    if (typeof c === 'string') {
      c = this._CAP_STYLES[c.toUpperCase()];
    }
    this.page.push(['lineCap', c]);
    return this;
  },

  _JOIN_STYLES: {
    MITER: 1,
    "MITER/BEVEL": 2,
    TRIANGULAR: 3,
    ROUND: 4,
    BEVEL: 5,
    NONE: 6
  },

  _lineJoin: function(j) {
    this._writeHPGL('LA2,' + j + ';');
  },

  lineJoin: function(i) {
    if (typeof j === 'string') {
      j = this._JOIN_STYLES[j.toUpperCase()];
    }
    this.page.push(['lineJoin', j]);
    return this;
  },

  _miterLimit: function(m) {
    this._writeHPGL('LA3,' + m + ';');
  },

  miterLimit: function(m) {
    this.page.push(['miterLimit', m]);
    return this;
  },

  _dash: function(length, options) {
    this._writeHPGL('LT2,' + length / 2 + ',1;');
  },

  dash: function(length, options) {
    this.page.push(['dash', length, options]);
    return this;
  },

  _undash: function() {
    this._writeHPGL('LT;');
  },

  undash: function() {
    this.page.push(['undash']);
    return this;
  },

  moveTo: function(x, y) {
    var coord = this._normalizeCoord(x, y);
    this._vectors.push(['moveTo', coord]);
    this._lastMove = this._pos = [x , y];
    return this;
  },

  lineTo: function(x, y) {
    var coord = this._normalizeCoord(x, y);
    this._vectors.push(['lineTo', coord]);
    this._pos = [x , y];
    return this;
  },

  bezierCurveTo: function(cp1x, cp1y, cp2x, cp2y, x, y) {
    var cp1 = this._normalizeCoord(cp1x, cp1y);
    var cp2 = this._normalizeCoord(cp2x, cp2y);
    var coord = this._normalizeCoord(x, y);
    this._vectors.push(['bezierCurveTo', cp1, cp2, coord]);
    this._pos = [x , y];
    return this;
  },

  quadraticCurveTo: function(cpx, cpy, x, y) {
    var cp1x = (this._pos[0] + 2 * cpx) / 3;
    var cp1y = (this._pos[1] + 2 * cpy) / 3;

    var cp2x = (x + 2 * cpx) / 3;
    var cp2y = (y + 2 * cpy) / 3;

    return this.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  },

  rect: function(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.lineTo(x, y);
    return this;
  },

  roundedRect: function(x, y, w, h, r) {
    if (r == null) {
      r = 0;
    }
    r = Math.min(r, 0.5 * w, 0.5 * h);

    // amount to inset control points from corners (see `ellipse`)
    const c = r * (1.0 - KAPPA);

    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.bezierCurveTo(x + w - c, y, x + w, y + c, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.bezierCurveTo(x + w, y + h - c, x + w - c, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.bezierCurveTo(x + c, y + h, x, y + h - c, x, y + h - r);
    this.lineTo(x, y + r);
    this.bezierCurveTo(x, y + c, x + c, y, x + r, y);
    return this.closePath();
  },

  ellipse: function(x, y, r1, r2) {
    // based on http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas/2173084#2173084
    r2 = r2 || r1;
    x -= r1;
    y -= r2;
    var ox = r1 * KAPPA;
    var oy = r2 * KAPPA;
    var xe = x + r1 * 2;
    var ye = y + r2 * 2;
    var xm = x + r1;
    var ym = y + r2;

    this.moveTo(x, ym);
    this.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
    this.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
    this.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
    this.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);

    return this.closePath();
  },

  circle: function(x, y, radius) {
    return this.ellipse(x, y, radius);
  },

  arc: function(x, y, radius, startAngle, endAngle, anticlockwise) {
    anticlockwise = anticlockwise || false;

    var TWO_PI = 2.0 * Math.PI;
    var HALF_PI = 0.5 * Math.PI;

    var deltaAng = endAngle - startAngle;

    if (Math.abs(deltaAng) > TWO_PI) {
      // draw only full circle if more than that is specified
      deltaAng = TWO_PI;
    } else if (deltaAng !== 0 && anticlockwise !== deltaAng < 0) {
      // necessary to flip direction of rendering
      var dir = anticlockwise ? -1 : 1;
      deltaAng = dir * TWO_PI + deltaAng;
    }

    var numSegs = Math.ceil(Math.abs(deltaAng) / HALF_PI);
    var segAng = deltaAng / numSegs;
    var handleLen = (segAng / HALF_PI) * KAPPA * radius;
    var curAng = startAngle;

    // component distances between anchor point and control point
    var deltaCx = -Math.sin(curAng) * handleLen;
    var deltaCy = Math.cos(curAng) * handleLen;

    // anchor point
    var ax = x + Math.cos(curAng) * radius;
    var ay = y + Math.sin(curAng) * radius;

    // calculate and render segments
    this.moveTo(ax, ay);

    for (
      var segIdx = 0, end = numSegs, asc = 0 <= end;
      asc ? segIdx < end : segIdx > end;
      asc ? segIdx++ : segIdx--
    ) {
      // starting control point
      var cp1x = ax + deltaCx;
      var cp1y = ay + deltaCy;

      // step angle
      curAng += segAng;

      // next anchor point
      ax = x + Math.cos(curAng) * radius;
      ay = y + Math.sin(curAng) * radius;

      // next control point delta
      deltaCx = -Math.sin(curAng) * handleLen;
      deltaCy = Math.cos(curAng) * handleLen;

      // ending control point
      var cp2x = ax - deltaCx;
      var cp2y = ay - deltaCy;

      // render segment
      this.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ax, ay);
    }

    return this;
  },

  polygon: function() {
    var self = this;
    var points = Array.prototype.slice.call(arguments);
    var mv = points.shift();
    this.moveTo(mv[0], mv[1]);
    points.forEach(function(point) {
      self.lineTo(point[0], point[1]);
    });
    return this.closePath();
  },

  path: function(path) {
    SVGPath.apply(this, path);
    return this;
  },

  _fill: function(vectors, options) {
    var self = this;
    self._writeHPGL('PC1,' + options.color[0] + ',' + options.color[1] + ',' + options.color[2] + ';SP1;');
    self._writeHPGL('PW' + options.lineWidth + ';');
    self._writeHPGL('TR0;');
    // polygon mode status
    var PM = false;
    vectors.forEach(function(vector) {
      // clone vector to avoid changes
      vector = vector.slice();
      var method = vector.shift();
      switch(method) {
        case 'moveTo':
          if (PM) {
            self._writeHPGL('PM2;FP;');
            PM = false;
          }
          self._writeHPGL('PU' + vector[0][0] + ',' + vector[0][1] + ';');
          break;
        case 'lineTo':
          if (!PM) {
            self._writeHPGL('PM0;');
            PM = true;
          }
          self._writeHPGL('PD' + vector[0][0] + ',' + vector[0][1] + ';');
          break;
        case 'bezierCurveTo':
          if (!PM) {
            self._writeHPGL('PM0;');
            PM = true;
          }
          self._writeHPGL('PD;BZ' + vector[0][0] + ',' + vector[0][1] + ',' + vector[1][0] + ',' + vector[1][1] + ',' + vector[2][0] + ',' + vector[2][1] + ';');
          break;
      }
    });
    if (PM) {
      this._writeHPGL('PM2;FP;');
    }
    this._writeHPGL('SP1;');
    return this;
  },

  fill: function(color, rule) {
    if (/(even-?odd)|(non-?zero)/.test(color)) {
      rule = color;
      color = null;
    }

    if (color) {
      color = this._normalizeColor(color);
    }
    
    var vectors = this._vectors;
    this._vectors = [];
    var options = {
      color: color || this._fillColor[0],
      opacity: this._fillColor[1],
      lineWidth: this._lineWidth
    };
    this.page.content.push(['fill', vectors, options]);
    return this;
  },

  _stroke: function(vectors, options) {
    var self = this;
    self._writeHPGL('PC1,' + options.color[0] + ',' + options.color[1] + ',' + options.color[2] + ';SP1;');
    self._writeHPGL('PW' + options.lineWidth + ';');
    vectors.forEach(function(vector) {
      // clone vector to avoid changes
      vector = vector.slice();
      var method = vector.shift();
      switch(method) {
        case 'moveTo':
          self._writeHPGL('PU' + vector[0][0] + ',' + vector[0][1] + ';');
          break;
        case 'lineTo':
          self._writeHPGL('PD' + vector[0][0] + ',' + vector[0][1] + ';');
          break;
        case 'bezierCurveTo':
          self._writeHPGL('PD;BZ' + vector[0][0] + ',' + vector[0][1] + ',' + vector[1][0] + ',' + vector[1][1] + ',' + vector[2][0] + ',' + vector[2][1] + ';');
          break;
      }
    });
  },

  stroke: function(color) {
    if (color) {
      color = this._normalizeColor(color);
    }
    var vectors = this._vectors;
    var options = {
      color: color || this._strokeColor[0],
      opacity: this._strokeColor[1],
      lineWidth: this._lineWidth
    };
    this._vectors = [];
    this.page.content.push(['stroke', vectors, options]);
    return this;
  },

  fillAndStroke: function(fillColor, strokeColor, rule) {

    strokeColor = strokeColor || fillColor;

    var isFillRule = /(even-?odd)|(non-?zero)/;

    if (isFillRule.test(fillColor)) {
      rule = fillColor;
      fillColor = null;
    }

    if (isFillRule.test(strokeColor)) {
      rule = strokeColor;
      strokeColor = fillColor;
    }

    // save vectors
    var vectors = this._vectors.slice();

    this.fill(fillColor, rule);

    // restore vectors
    this._vectors = vectors;

    this.stroke(strokeColor);

    return this;
  },

  clip: function(rule) {
    // pcl only support rectangular input window for soft clip
    return this;
  },

  transform: function(m11, m12, m21, m22, dx, dy) {
    // apply transformation to matrix
    var [m0, m1, m2, m3, m4, m5] = this._ctm;
    this._ctm[0] = m0 * m11 + m2 * m12;
    this._ctm[1] = m1 * m11 + m3 * m12;
    this._ctm[2] = m0 * m21 + m2 * m22;
    this._ctm[3] = m1 * m21 + m3 * m22;
    this._ctm[4] = m0 * dx + m2 * dy + m4;
    this._ctm[5] = m1 * dx + m3 * dy + m5;

    return this;
  },

  translate: function(x, y) {
    return this.transform(1, 0, 0, 1, x, y);
  },

  rotate: function(angle, options) {
    var y;
    options = options || {};
    var rad = (angle * Math.PI) / 180;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    var x = (y = 0);

    if (options.origin != null) {
      [x, y] = options.origin;
      var x1 = x * cos - y * sin;
      var y1 = x * sin + y * cos;
      x -= x1;
      y -= y1;
    }

    return this.transform(cos, sin, -sin, cos, x, y);
  },

  scale: function(xFactor, yFactor, options) {
    yFactor = yFactor || xFactor;
    options = options || {};
    if (typeof yFactor === 'object') {
      options = yFactor;
      yFactor = xFactor;
    }
    var x = 0;
    var y = 0;
    if (options.origin != null) {
      x = options.origin[0];
      y = options.origin[1];
      x -= xFactor * x;
      y -= yFactor * y;
    }
    return this.transform(xFactor, 0, 0, yFactor, x, y);
  }

};

