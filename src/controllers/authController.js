const User = require('../models/User');
const jwt = require('jsonwebtoken');
const passport = require('passport');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Register kelompok
const register = async (req, res) => {
  try {
    const { groupName, email, password, department, year, description, teamPhotoUrl, members } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user (kelompok)
    const user = await User.create({
      groupName,
      email,
      password,
      department,
      year
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      _id: user._id,
      groupName: user.groupName,
      email: user.email,
      department: user.department,
      year: user.year,
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      _id: user._id,
      groupName: user.groupName,
      email: user.email,
      department: user.department,
      year: user.year,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Google OAuth callback
const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    // Tandai user baru yang belum lengkap
    if (!user.groupName || !user.department || !user.year) {
      user.isIncomplete = true;
      await user.save();
    }

    const token = generateToken(user._id);

    if (user.isIncomplete) {
      // **Response JSON** untuk testing di Postman
      return res.status(200).json({
        message: 'Profile incomplete, complete via API',
        token,
        userId: user._id
      });
    }

    // Login normal, return token
    res.status(200).json({
      message: 'Login successful via Google',
      token,
      userId: user._id
    });

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Complete profile (API)
const completeProfile = async (req, res) => {
  try {
    const { groupName, department, year, members } = req.body; // tambahkan members
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.groupName = groupName;
    user.department = department;
    user.year = year;

    if (members && Array.isArray(members) && members.length > 0) {
      user.members = members; // simpan members baru
    }

    user.isIncomplete = false;

    await user.save();

    res.json({ message: 'Profile completed successfully', user });

  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  getMe,
  completeProfile
};
