const Project = require('../models/Project');
const Request = require('../models/Request');
const Rating = require('../models/Rating');
const Comment = require('../models/Comment');
const { getRedis } = require('../config/redis');

// ===============================
// GET ALL PROJECTS WITH CACHE
// ===============================
const getProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, theme, status, search } = req.query;
    const redisClient = getRedis();

    // Build query
    let query = {};
    if (theme) query.theme = theme;
    if (status) query.status = status;
    if (search) query.$text = { $search: search };

    const cacheKey = `projects:${JSON.stringify(query)}:page${page}:limit${limit}`;

    // Try get from cache
    const cachedProjects = await redisClient.get(cacheKey);
    if (cachedProjects) return res.json(JSON.parse(cachedProjects));

    // Query database
    const projects = await Project.find(query)
      .populate('ownerId', 'groupName department year teamPhotoUrl members')
      .select('-proposalDriveLink') // jangan kirim proposal untuk umum
      .limit(Number(limit))
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Project.countDocuments(query);

    const result = {
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    };

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// GET SINGLE PROJECT
// ===============================
const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const redisClient = getRedis();
    const cacheKey = `project:${id}`;

    const cachedProject = await redisClient.get(cacheKey);
    if (cachedProject) {
      const project = JSON.parse(cachedProject);
      if (!req.user || req.user.id !== project.ownerId._id.toString()) {
        delete project.proposalDriveLink;
      }
      return res.json(project);
    }

    const project = await Project.findById(id)
      .populate('ownerId', 'groupName department year teamPhotoUrl members');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const projectResponse = project.toObject();
    if (!req.user || req.user.id !== project.ownerId._id.toString()) {
      delete projectResponse.proposalDriveLink;
    }

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(projectResponse));
    res.json(projectResponse);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// CREATE PROJECT
// ===============================
const createProject = async (req, res) => {
  try {
    const { title, summary, evaluation, suggestion, theme, projectPhotoUrl, proposalDriveLink } = req.body;
    const redisClient = getRedis();

    const project = await Project.create({
      title,
      summary,
      evaluation,
      suggestion,
      theme,
      projectPhotoUrl,
      proposalDriveLink,
      ownerId: req.user.id
    });

    // Hapus cache projects list agar update langsung terlihat
    const keys = await redisClient.keys('projects:*');
    if (keys.length > 0) await redisClient.del(keys);

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// UPDATE PROJECT
// ===============================
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const redisClient = getRedis();

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Cek hanya pemilik project yang boleh update
    if (project.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const updatedProject = await Project.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    // Hapus cache project dan projects list
    await redisClient.del(`project:${id}`);
    const keys = await redisClient.keys('projects:*');
    if (keys.length > 0) await redisClient.del(keys);

    res.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// DELETE PROJECT
// ===============================
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const redisClient = getRedis();

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    await Project.findByIdAndDelete(id);
    await Request.deleteMany({ projectId: id });
    await Rating.deleteMany({ projectId: id });
    await Comment.deleteMany({ projectId: id });

    await redisClient.del(`project:${id}`);
    const keys = await redisClient.keys('projects:*');
    if (keys.length > 0) await redisClient.del(keys);

    res.json({ message: 'Project removed' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// GET PROPOSAL LINK (OWNER OR APPROVED REQUEST)
// ===============================
const getProposalLink = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.ownerId.toString() === req.user.id) {
      return res.json({ proposalDriveLink: project.proposalDriveLink });
    }

    const approvedRequest = await Request.findOne({
      projectId: id,
      requesterId: req.user.id,
      approved: true
    });

    if (approvedRequest) return res.json({ proposalDriveLink: project.proposalDriveLink });

    res.status(403).json({ message: 'You are not authorized to access the proposal' });
  } catch (error) {
    console.error('Get proposal link error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProposalLink
};
