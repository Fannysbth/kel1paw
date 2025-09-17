// routes/project.js
const express = require('express');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProposalLink
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { validateProjectMultipart } = require('../middleware/validation');
const upload = require('../middleware/upload');
const fixMultipart = require('../middleware/fixMultipart');

const router = express.Router();

router.post(
  '/',
  protect,
  upload.fields([
    { name: 'projectPhoto', maxCount: 1 },
    { name: 'proposal', maxCount: 1 }
  ]),
  validateProjectMultipart,
  createProject
);




router.route('/')
  .get(getProjects);

router.route('/:id')
  .get(getProject)
  .put(protect, upload.fields([
    { name: 'projectPhoto', maxCount: 1 },
    { name: 'proposal', maxCount: 1 }
  ]), validateProjectMultipart, updateProject)
  .delete(protect, deleteProject);

router.get('/:id/proposal', protect, getProposalLink);

module.exports = router;
