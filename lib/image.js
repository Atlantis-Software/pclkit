var fs = require('fs');
var JPEG = require('./image/jpeg');
var PNG = require('./image/png');

var PCLImage = {
  open: function(src, label) {
    var data;
    if (Buffer.isBuffer(src)) {
      data = src;
    } else if (src instanceof ArrayBuffer) {
      data = new Buffer(new Uint8Array(src));
    } else {
      var match;
      if ((match = /^data:.+;base64,(.*)$/.exec(src))) {
        data = new Buffer(match[1], 'base64');
      } else {
        data = fs.readFileSync(src);
        if (!data) {
          return;
        }
      }
    }

    if (data[0] === 0xff && data[1] === 0xd8) {
      return new JPEG(data, label);
    } else if (data[0] === 0x89 && data.toString('ascii', 1, 4) === 'PNG') {
      return new PNG(data, label);
    } else {
      throw new Error('Unknown image format.');
    }
  }
};

module.exports = PCLImage;
