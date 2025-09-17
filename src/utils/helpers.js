// utils/helpers.js
const jwt = require('jsonwebtoken');

// =======================
// JWT Token
// =======================
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// =======================
// Format User Response
// =======================
const formatUserResponse = (user) => {
  return {
    _id: user._id,
    groupName: user.groupName,
    email: user.email,
    department: user.department,
    year: user.year,
    description: user.description,
    teamPhotoUrl: user.teamPhotoUrl,
    members: user.members,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

// =======================
// Format Project Response
// =======================
/**
 * project: mongoose document atau object
 * userId: string, id user yang sedang login
 * approvedRequests: array of userId yang sudah disetujui
 */
const formatProjectResponse = (project, userId, approvedRequests = []) => {
  const projectObj = project.toObject ? project.toObject() : project;

  const isOwner = projectObj.ownerId._id.toString() === userId;
  const isApprovedRequester = approvedRequests.includes(userId);

  // Hanya owner atau approved requester yang bisa melihat proposalDriveLink
  if (!isOwner && !isApprovedRequester) {
    delete projectObj.proposalDriveLink;
  }

  return projectObj;
};

// =======================
// Pagination Helper
// =======================
const paginate = (query, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

// =======================
// Build Project Search Query
// =======================
const buildProjectSearchQuery = (search, theme, status) => {
  let query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { summary: { $regex: search, $options: 'i' } },
      { suggestion: { $regex: search, $options: 'i' } }
    ];
  }

  if (theme) {
    query.theme = theme;
  }

  if (status) {
    query.status = status;
  }

  return query;
};

module.exports = {
  generateToken,
  formatUserResponse,
  formatProjectResponse,
  paginate,
  buildProjectSearchQuery
};
