try {
  const pdf = require('pdf-parse');
  console.log('--- MODULE INSPECTION ---');
  console.log('pdf type:', typeof pdf);
  console.log('pdf keys:', Object.keys(pdf || {}));

  let parseFunc = null;
  if (typeof pdf === 'function') {
    console.log('pdf is a function');
    parseFunc = pdf;
  } else if (pdf && typeof pdf.PDFParse === 'function') {
    console.log('pdf.PDFParse is a function');
    parseFunc = pdf.PDFParse;
  } else if (pdf && pdf.default && typeof pdf.default === 'function') {
    console.log('pdf.default is a function');
    parseFunc = pdf.default;
  } else if (pdf && pdf.default && typeof pdf.default.PDFParse === 'function') {
    console.log('pdf.default.PDFParse is a function');
    parseFunc = pdf.default.PDFParse;
  }

  console.log('Final parseFunc type:', typeof parseFunc);

  if (parseFunc) {
    console.log('Attempting to instantiate PDFParse with new...');
    const dummyBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<Root 1 0 R>>\n%%EOF');
    try {
      const instance = new parseFunc(dummyBuffer);
      console.log('Instance created! Keys:', Object.keys(instance));
      // Check if it's a promise or has a then method
      if (typeof instance.then === 'function') {
        instance.then(data => {
          console.log('SUCCESS (as promise): Parsed text length:', data.text ? data.text.length : 'no text');
        }).catch(err => {
          console.log('FAILURE in promise:', err.message);
        });
      } else if (typeof instance.parse === 'function') {
        console.log('Found .parse() method, calling it...');
        instance.parse().then(data => {
          console.log('SUCCESS (via .parse()): Parsed text length:', data.text ? data.text.length : 'no text');
        }).catch(err => {
          console.log('FAILURE in .parse():', err.message);
        });
      }
    } catch (err) {
      console.log('FAILURE creating instance:', err.message);
    }
  }
  else {
    console.log('ERROR: No parsing function found');
  }
} catch (e) {
  console.log('CRITICAL ERROR:', e.message);
  console.log(e.stack);
}
