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

// ===============================
// UPDATE COMMENT (hanya pemilik comment)
// ===============================
const updateComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { text } = req.body;
    const redisClient = getRedis();

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // pastikan hanya pembuat comment yang bisa update
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    comment.text = text || comment.text;
    await comment.save();
    await comment.populate('userId', 'groupName');

    // invalidate cache
    await redisClient.del(`comments:project:${id}`);

    res.json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// DELETE COMMENT (hanya pemilik comment)
// ===============================
const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const redisClient = getRedis();

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // hanya pembuat comment yang bisa delete
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();

    // invalidate cache
    await redisClient.del(`comments:project:${id}`);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getComments,
  addComment,
  updateComment,
  deleteComment
};

