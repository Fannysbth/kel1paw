// routes/requestRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sendRequest, getRequests, approveRequest } = require('../controllers/requestController');

// POST request baru untuk proyek tertentu
router.post('/projects/:id/request', protect, sendRequest);

// GET semua request untuk proyek tertentu (owner)
router.get('/projects/:id/requests', protect, getRequests);

// POST approve request
router.post('/projects/:id/request/:requestId/approve', protect, approveRequest);

module.exports = router;
