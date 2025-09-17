// routes/ratings.js
const express = require('express');
const {
  getRatings,
  addRating
} = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');
const { validateRating } = require('../middleware/validation');

const router = express.Router();

router.route('/:id')
  .get(getRatings)
  .post(protect, validateRating, addRating);

module.exports = router;