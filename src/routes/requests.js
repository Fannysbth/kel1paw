const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {  
  sendRequest,
  getRequests,
  approveRequest,
  cancelRequest,
  rejectRequest,
  updateRequest 
} = require('../controllers/requestController');


// ✅ ROUTE YANG BENAR - tanpa duplikasi "requests"
router.put('/:requestId', protect, updateRequest); // PUT /api/requests/:requestId

// POST request baru untuk proyek tertentu
router.post('/projects/:id/request', protect, sendRequest);

// GET semua request untuk proyek tertentu (owner)
router.get('/projects/:id/requests', protect, getRequests);

// POST approve request
router.post('/projects/:id/request/:requestId/approve', protect, approveRequest);

// DELETE batalkan request oleh requester sendiri
router.delete('/:requestId/cancel', protect, cancelRequest); // ✅ path yang konsisten

// DELETE tolak request oleh owner
router.delete('/projects/:id/requests/:requestId/reject', protect, rejectRequest);

module.exports = router;