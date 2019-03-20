var PCLImage = require('../image');

module.exports = {
  initImages: function() {
    this._imageRegistry = {};
    this._imageCount = 0;
  },
  _image: function(x, y, w, h, img) {
    // Configure Image Data (CID) Command (for jpg and png)
    // Byte 0 (Color Space) 02 => Standard RGB (sRGB)
    // Byte 1 (Pixel Encoding Mode) 03 => Direct by Pixel
    // The number of bits per index (ignored in Direct by Pixel mode)
    // The number of bits in color component 08
    // The number of bits in color component 08
    // The number of bits in color component 08
    this._writePCL('\x1b*v6W');
    this._writeBinary(Buffer.from([0x02, 0x03, 0x00, 0x08, 0x08, 0x08]));
    // set cursor position (in decipoints)
    this._writePCL('\x1b&a' + x * 10 + 'h' + y * 10 + 'V');
    // print raster graphics in the orientation of the logical page
    this._writePCL('\x1b*r0F');
    // set Raster Resolution to 75 dots per inch
    this._writePCL('\x1b*t75R');
    // set raster pixel height
    this._writePCL('\x1b*r' + img.height + 'T');
    // set raster pixel width
    this._writePCL('\x1b*r' + img.width + 'S');
    // set destination raster width (in decipoints)
    this._writePCL('\x1b*t' + w * 10 + 'H');
    // set destination raster height (in decipoints)
    this._writePCL('\x1b*t' + h * 10 + 'V');
    // set left graphics margin to the current X position
    this._writePCL('\x1b*r3A');
    // set Y offset to 0
    this._writePCL('\x1b*b0Y');
    // set raster compression mode to no compression
    this._writePCL('\x1b*b0M');

    // transfert raster data
    for (var row = 0; row < img.height; row++) {
      var rowData = Buffer.alloc(3 * img.width);
      for (var col = 0; col < img.width; col++) {
        var color = img.getPixel(col, row);
        var pos = col * 3;
        rowData.writeUInt8(color[0], pos);
        rowData.writeUInt8(color[1], pos + 1);
        rowData.writeUInt8(color[2], pos + 2);
      }
      this._writePCL('\x1b*b' + rowData.length + 'W');
      this._writeBinary(rowData);
    }

    // end of raster image transfert
    this._writePCL('\x1b*rC');

  },
  image: function(src, x, y, options) {
    var bh, bp, bw, image, ip, left, left1;
    options = options || {};
    if (typeof x === 'object') {
      options = x;
      x = null;
    }

    x = (left = x != null ? x : options.x) != null ? left : this.x;
    y = (left1 = y != null ? y : options.y) != null ? left1 : this.y;

    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }

    if (!image) {
      if (src.width && src.height) {
        image = src;
      } else {
        image = this.openImage(src);
      }
    }

    var w = options.width || image.width;
    var h = options.height || image.height;

    if (options.width && !options.height) {
      var wp = w / image.width;
      w = image.width * wp;
      h = image.height * wp;
    } else if (options.height && !options.width) {
      var hp = h / image.height;
      w = image.width * hp;
      h = image.height * hp;
    } else if (options.scale) {
      w = image.width * options.scale;
      h = image.height * options.scale;
    } else if (options.fit) {
      [bw, bh] = options.fit;
      bp = bw / bh;
      ip = image.width / image.height;
      if (ip > bp) {
        w = bw;
        h = bw / ip;
      } else {
        h = bh;
        w = bh * ip;
      }
    } else if (options.cover) {
      [bw, bh] = options.cover;
      bp = bw / bh;
      ip = image.width / image.height;
      if (ip > bp) {
        h = bh;
        w = bh * ip;
      } else {
        w = bw;
        h = bw / ip;
      }
    }

    if (options.fit || options.cover) {
      if (options.align === 'center') {
        x = x + bw / 2 - w / 2;
      } else if (options.align === 'right') {
        x = x + bw - w;
      }

      if (options.valign === 'center') {
        y = y + bh / 2 - h / 2;
      } else if (options.valign === 'bottom') {
        y = y + bh - h;
      }
    }

    // Set the current y position to below the image if it is in the document flow
    if (this.y === y) {
      this.y += h;
    }

    this.page.content.push(['image', x, y, w, h, image]);

    return this;
  },

  openImage: function(src) {
    var image;
    if (typeof src === 'string') {
      image = this._imageRegistry[src];
    }

    if (!image) {
      image = PCLImage.open(src, `I${++this._imageCount}`);
      if (typeof src === 'string') {
        this._imageRegistry[src] = image;
      }
    }

    return image;
  }
};

