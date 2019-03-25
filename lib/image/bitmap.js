var Bitmap = function(width, height, data) {
  this.width = width;
  this.height = height;
  this.data = data;
};

Bitmap.prototype.getPixel = function(x,y, background) {
  var pos = (y * this.width + x) * 4;
  var r = this.data.readUInt8(pos);
  var g = this.data.readUInt8(pos + 1);
  var b = this.data.readUInt8(pos + 2);
  var a = this.data.readUInt8(pos + 3) / 255;

  if (background && a !== 1) {
    r = (r * a) + (background[0] * (1 - a));
    g = (g * a) + (background[1] * (1 - a));
    b = (b * a) + (background[2] * (1 - a));
  }

  return [r, g, b, a];
};

module.exports = Bitmap;
