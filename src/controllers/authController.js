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
    const { username, email, phone, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user with minimal data
    const user = await User.create({
      groupName: username, // Map username to groupName
      email,
      password,
      phone, // Store phone number
      isIncomplete: true // Mark as incomplete profile
    });

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. ',
      user: {
        _id: user._id,
        groupName: user.groupName,
        email: user.email,
        phone: user.phone,
        isIncomplete: user.isIncomplete
      },
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
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

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30
    });

    res.json({
  success: true,
  message: 'Login successful',
  user: {
    _id: user._id,
    groupName: user.groupName,
    email: user.email,
    phone: user.phone,
    department: user.department,
    year: user.year,
    description: user.description,
    isIncomplete: user.isIncomplete
  },
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

     res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30 // 30 hari
    });

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
    const { groupName, department, year, description, teamPhotoUrl, members } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.groupName = groupName || user.groupName;
    user.department = department;
    user.year = year;
    user.description = description;
    user.teamPhotoUrl = teamPhotoUrl;
    user.members = members || [];
    user.isIncomplete = false;

    await user.save();

    res.json({ 
      success: true,
      message: 'Profile completed successfully', 
      user 
    });

  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
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
  completeProfile,
  logout
};
