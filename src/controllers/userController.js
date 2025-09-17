// controllers/userController.js
const User = require('../models/User');

// Get profile sendiri
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create/register new user
const createUser = async (req, res) => {
  try {
    const { groupName, email, password, department, year, description } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

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
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user (hanya akun sendiri)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    Object.assign(user, req.body);
    await user.save();

    res.json({ message: 'User updated', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (hanya akun sendiri)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this account' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.remove();
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  getUser,
  createUser,
  updateUser,
  deleteUser
};
