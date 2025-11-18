// middleware/upload.js
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log('=== MULTER FILE FILTER ===');
  console.log('Field name:', file.fieldname);
  console.log('Original name:', file.originalname);
  console.log('Mimetype:', file.mimetype);
  
  try {
    if (file.fieldname === 'projectPhotos') {
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (validImageTypes.includes(file.mimetype)) {
        console.log('✓ Image file accepted');
        return cb(null, true);
      } else {
        console.log('✗ Image file rejected');
        return cb(new Error(`File ${file.originalname} harus berupa gambar (PNG/JPG/JPEG)`), false);
      }
    }
    
    if (file.fieldname === 'proposal') {
      if (file.mimetype === 'application/pdf') {
        console.log('✓ PDF file accepted');
        return cb(null, true);
      } else {
        console.log('✗ PDF file rejected');
        return cb(new Error(`File ${file.originalname} harus berupa PDF`), false);
      }
    }
    
    // Field name tidak dikenali
    console.log('✗ Unknown field name');
    return cb(new Error(`Field name tidak dikenali: ${file.fieldname}`), false);
    
  } catch (error) {
    console.error('Error in fileFilter:', error);
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 6, // max 6 files total (5 photos + 1 proposal)
  },
  fileFilter,
});

// **PERBAIKAN: Error handler yang mengirim JSON valid**
const handleMulterError = (err, req, res, next) => {
  console.log('=== MULTER ERROR HANDLER ===');
  
  if (!err) {
    console.log('No multer error, continuing...');
    return next();
  }
  
  console.error('Multer error:', err);
  
  // Handle Multer-specific errors
  if (err instanceof multer.MulterError) {
    console.log('MulterError type:', err.code);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File terlalu besar',
        error: 'Maksimal ukuran file adalah 10MB'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Terlalu banyak file',
        error: 'Maksimal 5 foto proyek dan 1 proposal'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Field file tidak dikenali',
        error: err.message
      });
    }
    
    // Generic multer error
    return res.status(400).json({
      message: 'Error upload file',
      error: err.message
    });
  }
  
  // Handle custom errors from fileFilter
  if (err.message) {
    return res.status(400).json({
      message: 'Validasi file gagal',
      error: err.message
    });
  }
  
  // Unknown error
  console.error('Unknown upload error:', err);
  return res.status(500).json({
    message: 'Terjadi kesalahan saat upload file',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

module.exports = { upload, handleMulterError };