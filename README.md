# pclkit
A JavaScript PCL generation library for Node.

## Description

PCLKit is a PCL document generation library for Node that makes creating complex, multi-page, printable 
documents easy. The API embraces chainability, and includes both low level functions as well as abstractions for higher 
level functionality. The PCLKit API(based on PDFKit API) is designed to be simple, so generating complex documents is often as simple as 
a few function calls.

Check out some of the [documentation and examples of PDFKit](http://pdfkit.org/docs/getting_started.html) to see for yourself!


## Installation

Installation uses the [npm](http://npmjs.org/) package manager.  Just type the following command after installing npm.

    npm install pclkit

## Features

* Vector graphics
  * HTML5 canvas-like API
  * Path operations
  * SVG path parser for easy path creation
  * Transformations
* Text
  * Line wrapping
  * Text alignments
  * Bulleted lists
* Font embedding
  * Supports TrueType (.ttf)
* Image embedding
  * Supports JPEG and PNG files (including indexed PNGs, and PNGs with transparency)

## Example

```javascript
const PCLDocument = require('pclkit');

// Create a document
const doc = new PCLDocument;

// Pipe its output somewhere, like to a file or HTTP response
// See below for browser usage
doc.pipe(fs.createWriteStream('output.prn'));

// Embed a font, set the font size, and render some text
doc.font('fonts/PalatinoBold.ttf')
   .fontSize(25)
   .text('Some text with an embedded font!', 100, 100);

// Add an image, constrain it to a given size, and center it vertically and horizontally
doc.image('path/to/image.png', {
   fit: [250, 300],
   align: 'center',
   valign: 'center'
});

// Add another page
doc.addPage()
   .fontSize(25)
   .text('Here is some vector graphics...', 100, 100);

// Draw a triangle
doc.save()
   .moveTo(100, 150)
   .lineTo(100, 250)
   .lineTo(200, 250)
   .fill("#FF3300");

// Apply some transforms and render an SVG path with the 'even-odd' fill rule
doc.scale(0.6)
   .translate(470, -380)
   .path('M 250,75 L 323,301 131,161 369,161 177,301 z')
   .fill('red', 'even-odd')
   .restore();

// Finalize PCL file
doc.end();
```

## Documentation

For complete API documentation and more examples, see the [PDFKit website](http://pdfkit.org/).

## License

PCLKit is available under the MIT license.
