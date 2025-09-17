const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth'); // middleware opsional

// GET profile sendiri
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET user by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new user (register)
router.post('/', async (req, res) => {
  try {
    const { groupName, email, password, department, year, description } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const newUser = await User.create({
      groupName,
      email,
      password,
      department,
      year,
      description
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        groupName: newUser.groupName,
        email: newUser.email,
        department: newUser.department,
        year: newUser.year
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update user (by ID)
router.put('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    Object.assign(user, req.body); // update semua field
    await user.save();

    res.json({ message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE user (by ID)
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this account' });
    }

    await user.remove();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
