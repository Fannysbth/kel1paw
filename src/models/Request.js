// models/Request.js
const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Ensure one request per user per project
requestSchema.index({ projectId: 1, requesterId: 1 }, { unique: true });

module.exports = mongoose.model('Request', requestSchema);