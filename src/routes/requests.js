const express = require('express');
const router = express.Router();
const Request = require('../models/Request');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth'); // login tetap wajib

// GET semua request (opsional, bisa filter by projectId)
router.get('/', protect, async (req, res) => {
  try {
    const { projectId } = req.query;
    let query = {};
    if (projectId) query.projectId = projectId;

    const requests = await Request.find(query)
      .populate('projectId', 'title ownerId')
      .populate('requesterId', 'groupName department year teamPhotoUrl');

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET request by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('projectId', 'title ownerId')
      .populate('requesterId', 'groupName department year teamPhotoUrl');

    if (!request) return res.status(404).json({ error: 'Request not found' });

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new request (login wajib)
router.post('/', protect, async (req, res) => {
  try {
    const { projectId, message } = req.body;
    const requesterId = req.user._id;

    // Cek apakah request sudah ada
    const existing = await Request.findOne({ projectId, requesterId });
    if (existing) return res.status(400).json({ error: 'Request already exists' });

    const newRequest = await Request.create({ projectId, requesterId, message });
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH approve request (hanya owner proyek)
router.patch('/:id/approve', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate('projectId');
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Cek ownership: hanya owner proyek yang boleh approve
    if (request.projectId.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only project owner can approve this request' });
    }

    request.approved = true;
    request.approvedAt = new Date();
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE request (hanya owner request atau owner proyek bisa hapus)
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).populate('projectId');
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const isRequester = request.requesterId.toString() === req.user._id.toString();
    const isProjectOwner = request.projectId.ownerId.toString() === req.user._id.toString();

    if (!isRequester && !isProjectOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this request' });
    }

    await request.deleteOne(); ;
    res.json({ message: 'Request deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
