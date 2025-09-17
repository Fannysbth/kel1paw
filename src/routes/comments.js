// routes/comments.js
const express = require('express');
const {
  getComments,
  addComment
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const { validateComment } = require('../middleware/validation');

const router = express.Router();

router.route('/:id')
  .get(getComments)
  .post(protect, validateComment, addComment);

module.exports = router;