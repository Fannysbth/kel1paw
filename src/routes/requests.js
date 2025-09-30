// routes/requestRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {  sendRequest,
  getRequests,
  approveRequest,
  cancelRequest,
  rejectRequest } = require('../controllers/requestController');

// POST request baru untuk proyek tertentu
router.post('/projects/:id/request', protect, sendRequest);

// GET semua request untuk proyek tertentu (owner)
router.get('/projects/:id/requests', protect, getRequests);

// POST approve request
router.post('/projects/:id/request/:requestId/approve', protect, approveRequest);

// DELETE batalkan request oleh requester sendiri
router.delete('/projects/:id/request/:requestId', protect, cancelRequest);

// DELETE tolak request oleh owner
router.delete('/projects/:id/request/:requestId/reject', protect, rejectRequest);


module.exports = router;
