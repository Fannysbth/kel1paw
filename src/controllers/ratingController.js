// controllers/ratingController.js
const mongoose = require('mongoose'); 
const Rating = require('../models/Rating');
const Project = require('../models/Project');
const { getRedis } = require('../config/redis');

// ===============================
// GET RATINGS FOR A PROJECT
// ===============================
const getRatings = async (req, res) => {
  try {
    const { id } = req.params;
    const redisClient = getRedis();
    const cacheKey = `ratings:project:${id}`;

    // Cek cache
    const cachedRatings = await redisClient.get(cacheKey);
    if (cachedRatings) {
      const data = JSON.parse(cachedRatings);
      data.cachedFromRedis = true; // tanda bahwa data dari cache
      return res.json(data);
    }

    const ratings = await Rating.find({ projectId: id })
      .populate('userId', 'groupName');

    const avgRating = await Rating.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, average: { $avg: '$score' } } }
    ]);

    const result = {
      ratings,
      average: avgRating.length > 0 ? avgRating[0].average : 0
    };

    // Set cache selama 1 jam
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// ADD OR UPDATE RATING
// ===============================
const addRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    const redisClient = getRedis();

    // Check project exists
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Check existing rating
    const existingRating = await Rating.findOne({
      projectId: id,
      userId: req.user.id
    });

    let rating;
    if (existingRating) {
      existingRating.score = score;
      rating = await existingRating.save();
    } else {
      rating = await Rating.create({
        projectId: id,
        userId: req.user.id,
        score
      });
    }

    // Update avg rating di project
    await updateProjectRating(id);

    // Hapus cache rating proyek karena ada perubahan
    await redisClient.del(`ratings:project:${id}`);

    res.status(201).json(rating);
  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// HELPER: UPDATE PROJECT AVG RATING
// ===============================
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

// ===============================
// DELETE RATING (hanya pemilik rating)
// ===============================
const deleteRating = async (req, res) => {
  try {
    const { id, ratingId } = req.params;
    const redisClient = getRedis();

    const rating = await Rating.findById(ratingId);
    if (!rating) return res.status(404).json({ message: 'Rating not found' });

    // hanya pemilik rating yang boleh hapus
    if (rating.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this rating' });
    }

    await rating.deleteOne();

    // update avg rating project setelah rating dihapus
    await updateProjectRating(id);

    // invalidate cache
    await redisClient.del(`ratings:project:${id}`);

    res.json({ message: 'Rating deleted successfully' });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getRatings,
  addRating,
  deleteRating
};

