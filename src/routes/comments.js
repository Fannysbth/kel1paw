const express = require('express');
const {
  getComments,
  addComment,
  updateComment,
  deleteComment
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const { validateComment } = require('../middleware/validation');

const router = express.Router();

router.route('/:id')
  .get(getComments) // get all comments for project
  .post(protect, validateComment, addComment); // add comment

// update & delete comment tertentu
router.route('/:id/:commentId')
  .put(protect, validateComment, updateComment)
  .delete(protect, deleteComment);

module.exports = router;
  