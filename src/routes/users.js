const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProfile,
  getUser,
  updateProfile,
  updateUser,
  addMember,
  updateMember,
  deleteMember,
  deleteUser
} = require('../controllers/userController');
const { upload } = require('../middleware/upload');


const Request = require('../models/Request'); // Jangan lupa import Request

const Project = require('../models/Project');
const Comment = require('../models/Comment'); // pastikan ada model Comment

// Get requests for logged in user
// Di route /api/users/requests - PERBAIKI BAGIAN INI
router.get('/requests', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const requests = await Request.find({ requesterId: userId })
      .populate({
    path: 'projectId',
    select: 'title theme projectPhotoUrls avgRating ownerId proposalDriveLink status',
    populate: {
      path: 'ownerId',
      select: 'groupName'
    }
  })
  .select('projectId message approved createdAt approvedAt')
  .sort({ createdAt: -1 })
  .lean();



    const projectIds = requests.map(r => r.projectId?._id).filter(Boolean);
    
    let commentCounts = {};
    if (projectIds.length > 0) {
      const comments = await Comment.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        { $group: { _id: '$projectId', count: { $sum: 1 } } }
      ]);
      
      commentCounts = comments.reduce((acc, curr) => {
        acc[curr._id.toString()] = curr.count;
        return acc;
      }, {});
    }

    // **PERBAIKAN LOGIC STATUS YANG BENAR:**
    const mappedRequests = requests.map((r) => {
      const projectIdStr = r.projectId?._id?.toString();
      const commentCount = projectIdStr ? commentCounts[projectIdStr] || 0 : 0;
      
      // **LOGIC STATUS YANG BENAR:**
      let status = "waiting for response"; // default
      
      if (r.approved === true) {
        status = "approved";
      } else if (r.approved === false && r.approvedAt) {
        // Hanya dianggap rejected jika sudah ada approvedAt (sudah diproses)
        status = "rejected";
      }
      // else: tetap "waiting for response"

      return {
        id: r._id,
        projectId: r.projectId?._id || null,
        title: r.projectId?.title || "Judul Tidak Tersedia",
        status: status,
        category: r.projectId?.theme || "-",
        group: r.projectId?.ownerId?.groupName || "-",
        thumbnail: r.projectId?.projectPhotoUrls?.[0] || null,
        rating: r.projectId?.avgRating || 0,
        commentCount: commentCount,
        message: r.message,
        createdAt: r.createdAt,
        approvedAt: r.approvedAt, // tambahkan ini untuk debug
        driveLink: r.projectId?.proposalDriveLink?.viewLink || null
      };
    });

    console.log('Processed requests:', mappedRequests.map(r => ({ 
      id: r.id, 
      status: r.status,
      approved: requests.find(req => req._id.toString() === r.id)?.approved,
      approvedAt: requests.find(req => req._id.toString() === r.id)?.approvedAt 
    })));

    res.json(mappedRequests);

  } catch (err) {
    console.error('Error fetching user requests:', err);
    res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET profile sendiri
router.get('/me', protect, getProfile);

// Update profile (text only)
router.put('/profile', protect, updateProfile);

// Update user dengan file upload
router.put('/me',
  protect,
  upload.fields([
    { name: 'teamPhoto', maxCount: 1 },
    { name: 'memberPhotos', maxCount: 50 }
  ]),
  updateUser
);

// Member management routes
router.post('/members', 
  protect,
  upload.fields([
    { name: 'memberPhoto', maxCount: 1 }
  ]),
  addMember
);

router.put('/members/:memberId', 
  protect,
  upload.fields([
    { name: 'memberPhoto', maxCount: 1 }
  ]),
  updateMember
);

router.delete('/members/:memberId', protect, deleteMember);

// Delete akun sendiri
router.delete('/me', protect, deleteUser);

// GET user by ID
router.get('/:id', protect, getUser);

module.exports = router;