// middleware/upload.js
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  if ((file.fieldname === 'projectPhoto' || file.fieldname === 'teamPhoto' || file.fieldname === 'memberPhotos') && isImage) return cb(null, true);
  if (file.fieldname === 'proposal' && file.mimetype === 'application/pdf') return cb(null, true);
  cb(new Error(`Invalid file type for ${file.fieldname}`));
};

module.exports = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});
