const express = require('express');
const { protect } = require('../middleware/auth');
const { validateProjectMultipart } = require('../middleware/validation');
const { upload, handleMulterError } = require('../middleware/upload');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProposalLink,
  checkUserProjectLimit,
  getUserProjects
} = require('../controllers/projectController');

const router = express.Router();

/* =========================================================
   USER ROUTES
========================================================= */
router.get('/user/check-limit', protect, checkUserProjectLimit);
router.get('/user/my-projects', protect, getUserProjects);
router.get('/user', getUserProjects);

/* =========================================================
   READ ROUTES
========================================================= */
router.get('/', getProjects);

// *** HARUS DI ATAS /:id ***
router.get('/:id/proposal', protect, getProposalLink);

// GET SINGLE PROJECT — LETAK PALING BAWAH
router.get('/:id', getProject);

/* =========================================================
   CREATE PROJECT
========================================================= */
router.post(
  '/',
  protect,
  
  // debug awal
  (req, res, next) => {
    console.log('=== POST /api/projects START ===');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Authorization:', req.headers.authorization ? 'Present' : 'Missing');
    next();
  },

  // multer
  (req, res, next) => {
    const uploadMiddleware = upload.fields([
      { name: 'projectPhotos', maxCount: 5 },
      { name: 'proposal', maxCount: 1 }
    ]);

    uploadMiddleware(req, res, (err) => {
      if (err) {
        console.error('=== MULTER ERROR ===', err);
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },

  // debug body & files
  (req, res, next) => {
    console.log('=== AFTER MULTER ===');
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'null');
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'null');

    if (req.body) {
      console.log('=== BODY ===');
      Object.keys(req.body).forEach(key => {
        console.log(`${key}:`, req.body[key]);
      });
    }

    if (req.files) {
      console.log('=== FILES ===');
      Object.keys(req.files).forEach(field => {
        console.log(`${field}: ${req.files[field].length} file(s)`);
      });
    }

    next();
  },

  validateProjectMultipart,

  // error handler khusus route ini
  (err, req, res, next) => {
    if (err) {
      console.error('=== ROUTE ERROR HANDLER ===', err);
      return res.status(err.statusCode || 500).json({
        message: err.message || 'Internal server error',
      });
    }
    next();
  },

  createProject
);

/* =========================================================
   UPDATE PROJECT
========================================================= */
// Di routes/project.js - pastikan route PUT ada
router.put(
  '/:id',
  protect,
  upload.fields([
    { name: 'projectPhotos', maxCount: 5 },
    { name: 'proposal', maxCount: 1 }
  ]),
  handleMulterError,
  validateProjectMultipart,
  updateProject
);
/* =========================================================
   DELETE PROJECT
========================================================= */
router.delete('/:id', deleteProject);

module.exports = router;
