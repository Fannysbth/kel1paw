// controllers/commentController.js
const Comment = require('../models/Comment');
const Project = require('../models/Project');

// Get comments for a project
const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const comments = await Comment.find({ projectId: id })
      .populate('userId', 'groupName')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add comment to a project
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    // Check if project exists
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const comment = await Comment.create({
      projectId: id,
      userId: req.user.id,
      text
    });
    
    // Populate user info
    await comment.populate('userId', 'groupName');
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getComments,
  addComment
};