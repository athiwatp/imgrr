const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const randomString = require('randomstring');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const helpers = require('./helpers');

const app = express();
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, './originals');
  },
  filename(req, file, cb) {
    cb(null, `${randomString.generate(11)}.png`);
  },
});
const upload = multer({ storage });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/ping', (request, response) => {
  response.json({
    pong: true,
  });
});

app.get('/:width/:height/:id', (request, response) => {
  const { width, height, id: folderName } = request.params;
  const cb = () => {
    response.status(200).sendFile(path.resolve(__dirname, 'uploads', folderName, `${width}x${height}.png`));
  };

  if (!folderName || !fs.existsSync(`./uploads/${folderName}`)) {
    console.log('folder not available');
    response.sendStatus(404);
    return null;
  }

  if (!fs.existsSync(`./uploads/${folderName}/${width}x${height}.png`)) {
    console.log('file not available. Resizing!');
    helpers.resizeAndSave(width, height, folderName, `${folderName}.png`, cb);
  } else {
    console.log('File available. Sending!');
    cb();
  }

  return null;
});

app.post('/api/upload', upload.single('image'), (request, response) => {
  const fileName = request.file.filename;
  const folderName = fileName.split('.')[0];
  const sizes = Object.keys(config.sizes);

  response.status(200).json({
    id: folderName,
  });

  if (!fs.existsSync(`./uploads/${folderName}`)) {
    fs.mkdirSync(`./uploads/${folderName}`);
  }

  sizes.forEach((size) => {
    helpers.resizeAndSave(
      config.sizes[size].width,
      config.sizes[size].height,
      folderName,
      fileName,
    );
  });
});

app.listen(config.image_service_port, () => {
  console.log(`Image service running on port ${config.image_service_port}`);
});
