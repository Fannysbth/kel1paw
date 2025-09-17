// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth'); // admin dihapus karena tidak perlu

// =====================
// GET profile sendiri
// =====================
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Update akun sendiri
router.put('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  Object.assign(user, req.body);
  await user.save();
  res.json({ message: 'User updated', user });
});

// Delete akun sendiri
router.delete('/me', protect, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted successfully' });
});

// =====================
// GET user by ID (opsional)
// =====================
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
