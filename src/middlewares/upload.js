const multer = require('multer');

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const fileFilter = (_req, file, callback) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  const error = new Error('Tipo de archivo no permitido. Usa JPG, PNG, GIF o WebP.');
  error.status = 415;
  callback(error);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024,
    files: 5,
  },
  fileFilter,
});

module.exports = upload;
