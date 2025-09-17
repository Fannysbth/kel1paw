// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProfile,
  getUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const upload = require('../middleware/upload');

// GET profile sendiri (pakai controller dengan Redis)
router.get('/me', protect, getProfile);


// Update akun sendiri
router.put('/me',
  protect,
  upload.fields([
     { name: 'teamPhoto', maxCount: 1 },
    { name: 'memberPhotos', maxCount: 50}
  ]),
updateUser
);

// Delete akun sendiri
router.delete('/me', protect, deleteUser);

// GET user by ID
router.get('/:id', protect, getUser);



module.exports = router;
