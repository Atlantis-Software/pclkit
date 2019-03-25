// Annotations do nothing as they aren't printed

module.exports = {
  note: function(x, y, width, height, contents, options) {
    return this;
  },
  link: function(x, y, width, height, url, options) {
    return this;
  },
  highlight: function(x, y, width, height, options) {
    return this;
  },
  underline: function(x, y, width, height, options) {
    return this;
  },
  strike: function(x, y, width, height, options) {
    return this;
  },
  lineAnnotation: function(x1, y1, x2, y2, options) {
    return this;
  },
  rectAnnotation: function(x, y, width, height, options) {
    return this;
  },
  ellipseAnnotation: function(x, y, width, height, options) {
    return this;
  },
  textAnnotation: function(x, y, width, height, text, options) {
    return this;
  }
};

