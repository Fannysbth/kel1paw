const Project = require('../models/Project');
const Request = require('../models/Request');
const Rating = require('../models/Rating');
const Comment = require('../models/Comment');
const { getRedis } = require('../config/redis');
const { uploadToDrive } = require('../utils/driveService');
const cloudinary = require('../config/cloudinary'); // Cloudinary config
const fs = require('fs');
const streamifier = require('streamifier');

// controllers/projectController.js - Tambahkan function ini

// Tambahkan di projectController.js

// ===============================
// CHECK USER PROJECT LIMIT
// ===============================
const checkUserProjectLimit = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userProjectCount = await Project.countDocuments({ ownerId: userId });
    const canCreateProject = userProjectCount === 0;

    res.json({
      canCreateProject,
      currentProjectCount: userProjectCount,
      maxProjects: 1
    });

  } catch (error) {
    console.error('Check project limit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// GET USER'S PROJECTS - PERBAIKAN
// ===============================
const getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id; // atau req.user._id tergantung struktur user
    console.log('Fetching projects for user:', userId);
    
    const redisClient = getRedis();
    const cacheKey = `user_projects:${userId}`;

    // Coba dari cache dulu
    const cachedProjects = await redisClient.get(cacheKey);
    if (cachedProjects) {
      console.log('Cache HIT for user projects');
      const result = JSON.parse(cachedProjects);
      return res.json(result);
    }

    // Query dari database
    const projects = await Project.find({ ownerId: userId })
      .populate('ownerId', 'groupName department year teamPhotoUrl members')
      .select('-proposalDriveLink') // sembunyikan proposal link
      .sort({ createdAt: -1 })
      .lean(); // gunakan lean() untuk performance

    console.log(`Found ${projects.length} projects for user ${userId}`);

    // **PERBAIKAN: Kembalikan array projects langsung**
    const result = {
      projects: projects,
      total: projects.length,
      hasProjects: projects.length > 0
    };

    // Cache hasilnya
    await redisClient.setEx(cacheKey, 1800, JSON.stringify(result));
    
    res.json(result);

  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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
      }
      project.cachedFromRedis = true;
      return res.json(project);
    }

    const project = await Project.findById(id)
      .populate('ownerId', 'groupName department year teamPhotoUrl members');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const projectResponse = project.toObject();
    if (!req.user || req.user.id !== project.ownerId._id.toString()) {

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
// controllers/projectController.js - Perbaiki createProject
const createProject = async (req, res) => {
  try {
    console.log('=== CREATE PROJECT START ===');
    console.log('User ID:', req.user.id);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    // Pastikan field sudah diproses dengan benar
    const { title, summary, evaluation, suggestion, theme } = req.body;

    const redisClient = getRedis();

    // Cek apakah user sudah memiliki proyek
    const existingProject = await Project.findOne({ ownerId: req.user.id });
    if (existingProject) {
      console.log('User already has project:', existingProject._id);
      return res.status(400).json({ 
        message: 'Anda sudah memiliki proyek. Setiap user hanya dapat memiliki 1 proyek.' 
      });
    }

    // ===== Upload project photos ke Cloudinary =====
    let projectPhotoUrls = [];
    if (req.files?.projectPhotos) {
      console.log(`Uploading ${req.files.projectPhotos.length} project photos...`);
      
      for (const file of req.files.projectPhotos) {
        try {
          console.log(`Uploading project photo: ${file.originalname}`);
          const url = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { 
                folder: 'project_photos',
                resource_type: 'image',
                format: 'jpg',
                quality: 'auto'
              },
              (error, result) => {
                if (error) {
                  console.error('Cloudinary upload error:', error);
                  return reject(error);
                }
                console.log('Cloudinary upload success:', result.secure_url);
                resolve(result.secure_url);
              }
            );
            
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          });
          projectPhotoUrls.push(url);
        } catch (uploadError) {
          console.error('Error uploading project photo:', uploadError);
          return res.status(500).json({ 
            message: `Gagal mengupload foto: ${file.originalname}` 
          });
        }
      }
    }

    // ===== Upload proposal ke Google Drive =====
    let proposalDriveLink = null;
    if (req.files?.proposal) {
      const file = req.files.proposal[0];
      try {
        console.log(`Uploading proposal: ${file.originalname}`);
        const driveData = await uploadToDrive(file.buffer, file.originalname, file.mimetype);
        
        proposalDriveLink = {
          fileName: file.originalname,
          driveFileId: driveData.id,
          viewLink: driveData.viewLink,
          downloadLink: driveData.downloadLink,
        };
        console.log('Proposal upload success:', proposalDriveLink);
      } catch (driveError) {
        console.error('Error uploading proposal:', driveError);
        return res.status(500).json({ 
          message: 'Gagal mengupload proposal ke Google Drive' 
        });
      }
    }

    // ===== Buat project di DB =====
    console.log('Creating project in database...');
    const project = await Project.create({
      title: title,
      summary: summary,
      evaluation: evaluation,
      suggestion: suggestion,
      theme: theme,
      projectPhotoUrls,
      proposalDriveLink,
      ownerId: req.user.id,
    });

    console.log('Project created successfully:', project._id);

    // ===== Clear cache Redis =====
    try {
      const keys = await redisClient.keys('projects:*');
      const userKeys = await redisClient.keys('user_projects:*');
      if (keys.length > 0) await redisClient.del(keys);
      if (userKeys.length > 0) await redisClient.del(userKeys);
      console.log('Cache cleared');
    } catch (cacheError) {
      console.error('Error clearing cache:', cacheError);
    }

    console.log('=== CREATE PROJECT SUCCESS ===');
    res.status(201).json({
      message: 'Proyek berhasil dibuat',
      project
    });
    
  } catch (error) {
    console.error('=== CREATE PROJECT ERROR ===');
    console.error('Error details:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Data tidak valid',
        errors 
      });
    }

    res.status(500).json({ 
      message: 'Terjadi kesalahan server saat membuat proyek',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
  getProposalLink,
  checkUserProjectLimit,
  getUserProjects
};
