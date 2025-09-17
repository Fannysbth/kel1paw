// controllers/ratingController.js
const mongoose = require('mongoose'); 
const Rating = require('../models/Rating');
const Project = require('../models/Project');

// Get ratings for a project
const getRatings = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ratings = await Rating.find({ projectId: id })
      .populate('userId', 'groupName');
    
    // Calculate average rating
    const avgRating = await Rating.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, average: { $avg: '$score' } } }
    ]);
    
    res.json({
      ratings,
      average: avgRating.length > 0 ? avgRating[0].average : 0
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add rating to a project
const addRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    
    // Check if project exists
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user has already rated this project
    const existingRating = await Rating.findOne({
      projectId: id,
      userId: req.user.id
    });
    
    if (existingRating) {
      // Update existing rating
      existingRating.score = score;
      await existingRating.save();
      return res.json(existingRating);
    }
    
    // Create new rating
    const rating = await Rating.create({
      projectId: id,
      userId: req.user.id,
      score
    });
    
    // Update project's average rating
    await updateProjectRating(id);
    
    res.status(201).json(rating);
  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to update project's average rating
const updateProjectRating = async (projectId) => {
  try {
    const result = await Rating.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: null, average: { $avg: '$score' }, count: { $sum: 1 } } }
    ]);
    
    if (result.length > 0) {
      await Project.findByIdAndUpdate(projectId, {
        avgRating: result[0].average,
        ratingCount: result[0].count
      });
    }
  } catch (error) {
    console.error('Update project rating error:', error);
  }
};

module.exports = {
  getRatings,
  addRating
};