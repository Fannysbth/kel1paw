const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  }
});

// Ensure one rating per user per project
ratingSchema.index({ projectId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);