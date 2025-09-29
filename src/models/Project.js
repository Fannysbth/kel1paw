// models/Project.js
const mongoose = require('mongoose');


const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    required: true
  },
  evaluation: {
    type: String,
    required: true
  },
  suggestion: {
    type: String,
    required: true
  },
  theme: {
    type: String,
    required: true,
    enum: ['Kesehatan', 'Pengelolaan Sampah', 'Smart City', 'Transportasi Ramah Lingkungan']
  },
  projectPhotoUrl: {
    type: String
  },
  proposalDriveLink: {
  fileName: { type: String },
  driveFileId: { type: String },
  viewLink: { type: String },
  downloadLink: { type: String }
},
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Closed'],
    default: 'Open'
  }
}, {
  timestamps: true
});

// Index for search functionality
projectSchema.index({ title: 'text', summary: 'text', theme: 1 });

module.exports = mongoose.model('Project', projectSchema);