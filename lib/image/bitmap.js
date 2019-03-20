var Bitmap = function(width, height, data) {
  this.width = width;
  this.height = height;
  this.data = data;
};

Bitmap.prototype.getPixel = function(x,y) {
  var pos = (y * this.width + x) * 4;
  var r = this.data.readUInt8(pos);
  var g = this.data.readUInt8(pos + 1);
  var b = this.data.readUInt8(pos + 2);
  var a = this.data.readUInt8(pos + 3);
  return [r, g, b, a];
};
    
Bitmap.prototype.resize = function(width, height) {
  var dst = new Bitmap(width, height);

  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var posDst = (y * width + x) * 4;
                
      var ySrc = Math.round(y * this.height / height);
      var xSrc = Math.round(x * this.width / width);
      var posSrc = (ySrc * this.width + xSrc) * 4;
                
      dst._data[posDst++] = this._data[posSrc++];
      dst._data[posDst++] = this._data[posSrc++];
      dst._data[posDst++] = this._data[posSrc++];
      dst._data[posDst++] = this._data[posSrc++];
    }
  }

  return dst;
};

module.exports = Bitmap;
