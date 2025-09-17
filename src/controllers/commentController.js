const Comment = require('../models/Comment');
const Project = require('../models/Project');
const { getRedis } = require('../config/redis');

// ===============================
// GET COMMENTS WITH CACHE
// ===============================
const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const redisClient = getRedis();
    const cacheKey = `comments:project:${id}`;

    // Cek cache dulu
    const cachedComments = await redisClient.get(cacheKey);
    if (cachedComments) {
      const comments = JSON.parse(cachedComments);
      // tandai kalau data dari Redis
      return res.json({ comments, cachedFromRedis: true });
    }

    // Ambil dari MongoDB
    const comments = await Comment.find({ projectId: id })
      .populate('userId', 'groupName')
      .sort({ createdAt: -1 });

    // Simpan ke Redis selama 1 jam
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(comments));

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// ADD COMMENT (invalidate cache)
// ===============================
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const redisClient = getRedis();

    // Cek project exist
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const comment = await Comment.create({
      projectId: id,
      userId: req.user.id,
      text
    });

    await comment.populate('userId', 'groupName');

    // Hapus cache comments proyek ini supaya update terlihat
    await redisClient.del(`comments:project:${id}`);

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
