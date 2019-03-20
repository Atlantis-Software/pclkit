var PNG = require('pngjs').PNG;
var Bitmap = require('./bitmap');

var PNGImage = function(data, label) {
  this.label = label;
  var img = PNG.sync.read(data);
  Bitmap.call(this, img.width, img.height, img.data);
};

// Inherit Image prototype
PNGImage.prototype = Object.create(Bitmap.prototype);
PNGImage.prototype.constructor = Bitmap;

module.exports = PNGImage;
