const Comment = require('../models/Comment');
const Project = require('../models/Project');
const { getRedis } = require('../config/redis');

// ===============================
// GET COMMENTS WITH CACHE
// ===============================
const getComments = async (req, res) => {
  try {
    const { projectId } = req.params;
    const redisClient = getRedis();
    const cacheKey = `comments:project:${projectId}`;

    // Check cache
    const cachedComments = await redisClient.get(cacheKey);
    if (cachedComments) {
      return res.json(JSON.parse(cachedComments));
    }

    // Ambil komentar parent
    const comments = await Comment.find({
      projectId: projectId,
      parentId: null
    })
      .populate('userId', '_id groupName')
      .sort({ createdAt: -1 });

    // Ambil reply per comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentId: comment._id })
          .populate('userId', '_id groupName')
          .sort({ createdAt: 1 });

        return {
          ...comment.toObject(),
          replies
        };
      })
    );

    // Save to cache
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(commentsWithReplies));

    res.json(commentsWithReplies);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// ADD COMMENT
// ===============================
const addComment = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { text } = req.body;
    const redisClient = getRedis();

    // Check project exist
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const comment = await Comment.create({
      projectId,
      userId: req.user.id,
      text
    });

    await comment.populate('userId', 'groupName');

    // Delete cache
    await redisClient.del(`comments:project:${projectId}`);

    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// UPDATE COMMENT
// ===============================
const updateComment = async (req, res) => {
  try {
    const { projectId, commentId } = req.params;
    const { text } = req.body;
    const redisClient = getRedis();

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // only owner can edit
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    comment.text = text || comment.text;
    await comment.save();
    await comment.populate('userId', 'groupName');

    // invalidate cache
    await redisClient.del(`comments:project:${projectId}`);

    res.json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// DELETE COMMENT
// ===============================
const deleteComment = async (req, res) => {
  try {
    const { projectId, commentId } = req.params;
    const redisClient = getRedis();

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Only owner can delete
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();

    // Invalidate cache
    await redisClient.del(`comments:project:${projectId}`);

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
