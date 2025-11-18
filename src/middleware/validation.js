// middleware/validation.js
const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules for user registration
const validateRegistration = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),

  body('phone')
    .notEmpty()
    .withMessage('Phone number is required'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  handleValidationErrors
];

// Validation rules for project creation
const validateProject = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('summary')
    .notEmpty()
    .withMessage('Summary is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Summary must be between 10 and 500 characters'),
  body('evaluation')
    .notEmpty()
    .withMessage('Evaluation is required')
    .isLength({ min: 10 })
    .withMessage('Evaluation must be at least 10 characters long'),
  body('suggestion')
    .notEmpty()
    .withMessage('Suggestion is required')
    .isLength({ min: 10 })
    .withMessage('Suggestion must be at least 10 characters long'),
  body('theme')
    .isIn(['Kesehatan', 'Pengelolaan Sampah', 'Smart City', 'Transportasi Ramah Lingkungan'])
    .withMessage('Please select a valid theme'),
  handleValidationErrors
];

// Validation rules for comments
const validateComment = [
  body('text')
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  handleValidationErrors
];

// Validation rules for ratings
const validateRating = [
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  handleValidationErrors
];

// **PERBAIKAN: Validation untuk multipart form data**
const validateProjectMultipart = (req, res, next) => {
  console.log('=== VALIDATION MIDDLEWARE START ===');
  console.log('Request method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body keys:', req.body ? Object.keys(req.body) : 'null');
  console.log('Request files keys:', req.files ? Object.keys(req.files) : 'null');

  const errors = [];

  try {
    // **PERBAIKAN: Check if req.body exists**
    if (!req.body || typeof req.body !== 'object') {
      console.error('req.body is null or not an object:', req.body);
      return res.status(400).json({ 
        message: 'Invalid request body',
        error: 'Request body is missing or malformed'
      });
    }

    // **Helper function untuk memproses field dari FormData**
    const getFieldValue = (fieldName) => {
      try {
        if (!req.body[fieldName]) return null;
        
        const value = req.body[fieldName];
        
        // Jika array (dari FormData), ambil elemen pertama
        if (Array.isArray(value)) {
          const firstValue = value[0];
          if (firstValue === null || firstValue === undefined) return null;
          return firstValue.toString().trim() || null;
        }
        
        // Jika string biasa
        if (typeof value === 'string') {
          return value.trim() || null;
        }
        
        // Jika number atau boolean, convert ke string
        if (typeof value === 'number' || typeof value === 'boolean') {
          return value.toString();
        }
        
        return null;
      } catch (err) {
        console.error(`Error processing field ${fieldName}:`, err);
        return null;
      }
    };

    // Extract dan normalize semua field
    const title = getFieldValue('title');
    const summary = getFieldValue('summary');
    const evaluation = getFieldValue('evaluation');
    const suggestion = getFieldValue('suggestion');
    const theme = getFieldValue('theme');

    console.log('Extracted values:', { title, summary, evaluation, suggestion, theme });

    // Update req.body dengan values yang sudah dinormalisasi
    req.body.title = title;
    req.body.summary = summary;
    req.body.evaluation = evaluation;
    req.body.suggestion = suggestion;
    req.body.theme = theme;

    // Validasi field required
    if (!title) {
      errors.push('Judul proyek harus diisi');
    } else if (title.length < 2) {
      errors.push('Judul proyek minimal 2 karakter');
    } else if (title.length > 100) {
      errors.push('Judul proyek maksimal 100 karakter');
    }

    if (!summary) {
      errors.push('Ringkasan proyek harus diisi');
    } else if (summary.length < 10) {
      errors.push('Ringkasan proyek minimal 10 karakter');
    } else if (summary.length > 500) {
      errors.push('Ringkasan proyek maksimal 500 karakter');
    }

    if (!evaluation) {
      errors.push('Evaluasi proyek harus diisi');
    } else if (evaluation.length < 10) {
      errors.push('Evaluasi proyek minimal 10 karakter');
    }

    if (!suggestion) {
      errors.push('Saran pengembangan harus diisi');
    } else if (suggestion.length < 10) {
      errors.push('Saran pengembangan minimal 10 karakter');
    }

    const validThemes = [
      'Kesehatan', 
      'Pengelolaan Sampah', 
      'Smart City', 
      'Transportasi Ramah Lingkungan'
    ];
    
    if (!theme || !validThemes.includes(theme)) {
      errors.push('Kategori proyek harus dipilih dari opsi yang tersedia');
    }

    // Validasi file upload untuk POST (create)
    if (req.method === 'POST') {
      if (!req.files?.projectPhotos || req.files.projectPhotos.length === 0) {
        errors.push('Foto proyek harus diupload (minimal 1 foto)');
      } else if (req.files.projectPhotos.length > 5) {
        errors.push('Maksimal 5 foto proyek');
      }

      if (!req.files?.proposal || req.files.proposal.length === 0) {
        errors.push('Proposal (PDF) harus diupload');
      }
    }

    // Validasi file upload untuk PUT (update) - opsional
    if (req.method === 'PUT') {
      if (req.files?.projectPhotos && req.files.projectPhotos.length > 5) {
        errors.push('Maksimal 5 foto proyek');
      }
    }

  } catch (error) {
    console.error('Error in validation middleware:', error);
    return res.status(500).json({ 
      error: 'Terjadi kesalahan dalam validasi data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  console.log('Validation errors:', errors);

  if (errors.length > 0) {
    console.log('=== VALIDATION FAILED ===');
    return res.status(400).json({ 
      message: 'Validasi gagal', 
      errors 
    });
  }

  console.log('=== VALIDATION PASSED ===');
  next();
};

module.exports = {
  validateRegistration,
  validateProject,
  validateComment,
  validateProjectMultipart,
  validateRating
};