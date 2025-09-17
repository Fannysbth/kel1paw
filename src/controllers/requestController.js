const Request = require('../models/Request');
const Project = require('../models/Project');
const User = require('../models/User');
const { sendNotification } = require('../utils/emailService');
const { uploadToDrive } = require('../utils/driveService'); 

// Kirim request untuk melanjutkan proyek
const sendRequest = async (req, res) => {
  try {
    const { id } = req.params; // id proyek
    const { message } = req.body;

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Cek apakah pengirim adalah owner proyek
    if (project.ownerId.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot send a request for your own project' });
    }

    // Cek apakah sudah request sebelumnya
    const existingRequest = await Request.findOne({
      projectId: id,
      requesterId: req.user.id
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You have already sent a request for this project' });
    }

    // Buat request baru
    const request = await Request.create({
      projectId: id,
      requesterId: req.user.id,
      message
    });

    await request.populate('requesterId', 'groupName email');

    // Kirim notifikasi ke owner proyek
    const owner = await User.findById(project.ownerId);
    if (owner && owner.email) {
      await sendNotification(
        owner.email,
        'New Request for Your Project',
        `You have a new request from ${request.requesterId.groupName} (${request.requesterId.email}) for your project "${project.title}".\n\nMessage: ${message}`
      );
    }

    res.status(201).json(request);
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get semua request untuk proyek (hanya owner proyek)
const getRequests = async (req, res) => {
  try {
    const { id } = req.params; // id proyek

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Cek ownership (hanya owner proyek)
    if (project.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view requests for this project' });
    }

    const requests = await Request.find({ projectId: id })
      .populate('requesterId', 'groupName department year teamPhotoUrl');

    res.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve request (hanya owner proyek)
// Approve request (hanya owner proyek)
const approveRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;   // id project & id request

    // ✅ cari project
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // ✅ hanya owner
    const userId = req.user._id || req.user.id;
    if (project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to approve requests for this project' });
    }

    // ✅ cari request
    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // set status approved
    request.approved = true;
    request.approvedAt = new Date();
    // Tidak perlu uploadToDrive lagi
    await request.save();

    // ambil link proposal dari project
    const projectProposalLink = project.proposalDriveLink?.viewLink || null;

    // kirim email ke requester (opsional)
    const requester = await User.findById(request.requesterId);
    if (requester?.email) {
      await sendNotification(
        requester.email,
        'Your Request Has Been Approved',
        `Halo ${requester.groupName || requester.name},

Request Anda untuk proyek "${project.title}" telah disetujui.

Link proposal: ${projectProposalLink ?? '-'}`
      );
    }

    // ✅ kirim response
    res.json({
      message: 'Request approved successfully',
      proposalLink: projectProposalLink   // 👈 dari data project
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



module.exports = {
  sendRequest,
  getRequests,
  approveRequest
};
