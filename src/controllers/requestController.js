const Request = require('../models/Request');
const Project = require('../models/Project');
const User = require('../models/User');
const { sendNotification } = require('../utils/emailService');



// Kirim request untuk melanjutkan proyek
const sendRequest = async (req, res) => {
  try {
    const { id } = req.params; // id proyek
    const { message } = req.body;

    // Validasi input
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Pesan harus diisi' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project tidak ditemukan' });
    }

    // Cek apakah proyek available untuk dilanjutkan
    if (project.status !== 'Open') {
  return res.status(400).json({ message: 'Project ini sudah tidak tersedia untuk dilanjutkan' });
}

    // Cek apakah pengirim adalah owner proyek
    const userId = req.user._id || req.user.id;
    if (project.ownerId.toString() === userId.toString()) {
      return res.status(400).json({ message: 'Anda tidak dapat mengirim request untuk project sendiri' });
    }

    // Cek apakah user sudah memiliki request yang disetujui di project lain
    const approvedRequest = await Request.findOne({
      requesterId: userId,
      approved: true
    });
    
    if (approvedRequest) {
      return res.status(400).json({ 
        message: 'Anda sudah memiliki project yang disetujui. Tidak dapat mengirim request baru.' 
      });
    }

    // Cek apakah sudah request sebelumnya untuk project ini
    const existingRequest = await Request.findOne({
      projectId: id,
      requesterId: userId
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'Anda sudah mengirim request untuk project ini' 
      });
    }

    // Buat request baru
    const request = await Request.create({
      projectId: id,
      requesterId: userId,
      message: message.trim()
    });

    await request.populate('requesterId', 'groupName email name');

    // Kirim notifikasi ke owner proyek
    const owner = await User.findById(project.ownerId);
    if (owner?.email) {
      await sendNotification(
        owner.email,
        'Permintaan Baru untuk Project Anda',
        `Halo ${owner.name || owner.groupName},

Anda memiliki permintaan baru dari ${request.requesterId.groupName || request.requesterId.name} (${request.requesterId.email}) untuk project "${project.title}".

Pesan: ${message}

Silakan login untuk meninjau permintaan ini.`
      );
    }

    res.status(201).json({
      message: 'Request berhasil dikirim',
      request: {
        id: request._id,
        projectId: request.projectId,
        message: request.message,
        createdAt: request.createdAt
      }
    });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ... (fungsi lainnya tetap sama)


// Get semua request untuk proyek (hanya owner proyek)
const getRequests = async (req, res) => {
  try {
    const { id } = req.params; // id proyek

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Cek ownership (hanya owner proyek)
   const userId = req.user._id || req.user.id;
if (project.ownerId.toString() !== userId.toString()) {
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

// otomatis reject request lain user yang sama di project lain
await Request.updateMany(
  { requesterId: request.requesterId, _id: { $ne: request._id }, approved: false },
  { $set: { approved: false } } // atau delete jika mau dihapus
);

// kirim email ke requester
const requester = await User.findById(request.requesterId);
if (requester?.email) {
  await sendNotification(
    requester.email,
    'Your Request Has Been Approved',
    `Halo ${requester.groupName || requester.name},

Request Anda untuk proyek "${project.title}" telah disetujui.

Link proposal: ${project.proposalDriveLink?.viewLink ?? '-'}` 
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

// Requester membatalkan request sendiri
// Requester membatalkan request sendiri
const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.params; 

    // cek request
    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // hanya requester boleh cancel
    const userId = req.user._id || req.user.id;
    if (request.requesterId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this request' });
    }

    await request.deleteOne();

    res.json({ message: 'Request cancelled successfully' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Owner menolak request
const rejectRequest = async (req, res) => {
  try {
    const { id, requestId } = req.params;

    // cek project
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // hanya owner boleh reject
    const userId = req.user._id || req.user.id;
if (project.ownerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject requests for this project' });
    }

    // cek request
    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // hapus
    await request.deleteOne();

    // opsional: kirim email notifikasi ke requester
    const requester = await User.findById(request.requesterId);
    if (requester?.email) {
      await sendNotification(
        requester.email,
        'Your Request Has Been Rejected',
        `Halo ${requester.groupName || requester.name},

Request Anda untuk proyek "${project.title}" telah ditolak oleh owner.`
      );
    }

    res.json({ message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// controllers/requestController.js - Tambahkan fungsi ini

// Update request oleh requester sendiri
// Update request oleh requester sendiri
const updateRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message } = req.body;

    console.log('Update request called for:', requestId); // Debug log

    // Validasi input
    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Pesan harus diisi' });
    }

    // Cari request
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request tidak ditemukan' });
    }

    // Cek ownership - hanya requester yang boleh update
    const userId = req.user._id || req.user.id;
    if (request.requesterId.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: 'Tidak diizinkan mengupdate request ini' 
      });
    }

    // Cek status - hanya bisa update jika status masih waiting/null
    if (request.approved !== null) {
      return res.status(400).json({ 
        message: 'Tidak dapat mengupdate request yang sudah diproses' 
      });
    }

    // Update request
    request.message = message.trim();
    await request.save();

    console.log('Request updated successfully:', requestId); // Debug log

    res.json({
      message: 'Request berhasil diupdate',
      request: {
        id: request._id,
        message: request.message,
        updatedAt: request.updatedAt
      }
    });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ 
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Jangan lupa export fungsi updateRequest
module.exports = {
  sendRequest,
  getRequests,
  approveRequest,
  cancelRequest,
  rejectRequest,
  updateRequest // tambahkan ini
};

