const express = require('express');
const {
  getRatings,
  addRating,
  deleteRating
} = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');
const { validateRating } = require('../middleware/validation');

const router = express.Router();

// DELETE harus ditaruh dulu
router.delete('/:projectId/:ratingId', protect, deleteRating);

// GET & POST rating
router.route('/:projectId')
  .get(getRatings)
  .post(protect, validateRating, addRating);

module.exports = router;
