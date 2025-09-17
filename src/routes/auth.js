// routes/auth.js (diperbarui)
const express = require('express');
const passport = require('passport');
const {
  register,
  login,
  googleCallback,
  getMe,
  completeProfile 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegistration } = require('../middleware/validation');

const router = express.Router();

router.post('/register', validateRegistration, register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  googleCallback
);

router.post('/complete-profile', protect, completeProfile);

module.exports = router;