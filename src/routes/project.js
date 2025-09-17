// routes/projects.js (diperbarui)
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
const { validateProject } = require('../middleware/validation');

const router = express.Router();

router.route('/')
  .get(getProjects)
  .post(protect, validateProject, createProject);

router.route('/:id')
  .get(getProject)
  .put(protect, validateProject, updateProject)
  .delete(protect, deleteProject);

router.get('/:id/proposal', protect, getProposalLink);

module.exports = router;