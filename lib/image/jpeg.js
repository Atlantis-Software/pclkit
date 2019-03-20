var jpeg = require('jpeg-js');
var Bitmap = require('./bitmap');

var JPEG = function(data, label) {
  this.label = label;
  var img = jpeg.decode(data);
  // Inherit properties
  Bitmap.call(this, img.width, img.height, img.data);
};

// Inherit Image prototype
JPEG.prototype = Object.create(Bitmap.prototype);
JPEG.prototype.constructor = Bitmap;

module.exports = JPEG;

