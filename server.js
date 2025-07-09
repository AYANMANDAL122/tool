const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const libre = require('libreoffice-convert');
const JSZip = require('jszip');

const app = express();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Set up multer to use uploads folder
const upload = multer({ dest: uploadDir });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// 📄 PDF to Word
app.post('/convert/pdf-to-word', upload.single('file'), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = `${inputPath}.docx`;

  const file = fs.readFileSync(inputPath);

  libre.convert(file, '.docx', undefined, (err, done) => {
    if (err) {
      console.error('LibreOffice conversion failed:', err);
      return res.status(500).send('PDF to Word conversion failed.');
    }

    fs.writeFileSync(outputPath, done);

    res.download(outputPath, 'converted.docx', () => {
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    });
  });
});

// 🔗 Merge PDFs
app.post('/merge/pdf', upload.array('files'), async (req, res) => {
  const mergedPdf = await PDFDocument.create();

  try {
    for (const file of req.files) {
      const buffer = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(buffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
      fs.unlinkSync(file.path);
    }

    const mergedBuffer = await mergedPdf.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=merged.pdf');
    res.send(Buffer.from(mergedBuffer));
  } catch (err) {
    console.error('PDF merge failed:', err);
    res.status(500).send('Failed to merge PDFs.');
  }
});

// ✂️ Split PDF
app.post('/split/pdf', upload.single('file'), async (req, res) => {
  try {
    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const outputDocs = [];

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);
      const singlePageBytes = await newPdf.save();
      outputDocs.push({ filename: `page-${i + 1}.pdf`, data: singlePageBytes });
    }

    const zip = new JSZip();
    outputDocs.forEach(doc => zip.file(doc.filename, doc.data));

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.unlinkSync(req.file.path);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=split-pages.zip');
    res.send(zipBuffer);
  } catch (err) {
    console.error('Split PDF failed:', err);
    res.status(500).send('Failed to split PDF.');
  }
});

// 📦 Compress PDF (basic optimization only)
app.post('/compress/pdf', upload.single('file'), async (req, res) => {
  try {
    const originalBuffer = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(originalBuffer);
    const compressedBuffer = await pdfDoc.save();
    fs.unlinkSync(req.file.path);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=compressed.pdf');
    res.send(compressedBuffer);
  } catch (err) {
    console.error('Compress PDF failed:', err);
    res.status(500).send('Failed to compress PDF.');
  }
});

// ❗ Global Error Handler
app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err.stack || err);
  res.status(500).send('Something broke!');
});

// ✅ Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
