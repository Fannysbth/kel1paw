const Project = require('../models/Project');
const Request = require('../models/Request');
const Rating = require('../models/Rating');
const Comment = require('../models/Comment');
const { getRedis } = require('../config/redis');
const { uploadToDrive } = require('../utils/driveService');
const cloudinary = require('../config/cloudinary'); // Cloudinary config
const fs = require('fs');
const streamifier = require('streamifier');

// ===============================
// GET ALL PROJECTS WITH CACHE
// ===============================
const getProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, theme, status, search } = req.query;
    const redisClient = getRedis();

    let query = {};
    if (theme) query.theme = theme;
    if (status) query.status = status;
    if (search) query.$text = { $search: search };

    const cacheKey = `projects:${JSON.stringify(query)}:page${page}:limit${limit}`;
    const cachedProjects = await redisClient.get(cacheKey);
    if (cachedProjects) {
      const result = JSON.parse(cachedProjects);
      result.cachedFromRedis = true;
      return res.json(result);
    }

    const projects = await Project.find(query)
      .populate('ownerId', 'groupName department year teamPhotoUrl members')
      .select('-proposalDriveLink')
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
      project.cachedFromRedis = true;
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
    const { title, summary, evaluation, suggestion, theme } = req.body;
    const redisClient = getRedis();

    // ===== Upload project photo ke Cloudinary =====
    let projectPhotoUrl = null;
    if (req.files?.projectPhoto) {
      const file = req.files.projectPhoto[0];
      projectPhotoUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'project_photos' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });
    }

    // ===== Upload proposal ke Google Drive =====
    let proposalDriveLink = null;
    if (req.files?.proposal) {
      const file = req.files.proposal[0];
      const driveData = await uploadToDrive(file.buffer, file.originalname, file.mimetype);

      proposalDriveLink = {
        fileName: file.originalname,
        driveFileId: driveData.id,
        viewLink: driveData.viewLink,
        downloadLink: driveData.downloadLink,
      };
    }

    // ===== Buat project di DB =====
    const project = await Project.create({
      title,
      summary,
      evaluation,
      suggestion,
      theme,
      projectPhotoUrl,
      proposalDriveLink,
      ownerId: req.user.id,
    });

    // ===== Clear cache Redis =====
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

    if (project.ownerId.toString() !== req.user._id.toString()) {
  return res.status(403).json({ message: 'Not authorized to update this project' });
}

    const updatedProject = await Project.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

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
// GET PROPOSAL LINK
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
