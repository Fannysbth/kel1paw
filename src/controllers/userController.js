const User = require('../models/User');
const { getRedis } = require('../config/redis');

const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');


// ===============================
// GET PROFILE SENDIRI
// ===============================
const getProfile = async (req, res) => {
  try {
    const redisClient = getRedis();
    const cacheKey = `user:${req.user.id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const user = JSON.parse(cached);
      user.cachedFromRedis = true;
      return res.json(user);
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(user));

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// GET USER BY ID
// ===============================
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const redisClient = getRedis();
    const cacheKey = `user:${id}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const user = JSON.parse(cached);
      user.cachedFromRedis = true;
      return res.json(user);
    }

    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    await redisClient.setEx(cacheKey, 3600, JSON.stringify(user));

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// CREATE USER
// ===============================
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

// ===============================
// UPDATE USER
// ===============================
const updateUser = async (req, res) => {
  try {
    const targetId = req.user.id;   // langsung pakai id dari token

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // ===============================
    // Upload team photo (opsional)
    // ===============================
    if (req.files?.teamPhoto) {
      const file = req.files.teamPhoto[0];
      const teamPhotoUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'team_photos' },
          (err, result) => (err ? reject(err) : resolve(result.secure_url))
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });
      user.teamPhotoUrl = teamPhotoUrl;
    }

    // ===============================
// Upload member photos (opsional)
// ===============================
if (req.body.members) {
  let members = [];

  // jika members string, parse JSON
  if (typeof req.body.members === 'string') {
    if (req.body.members.trim() !== '') {
      try {
        members = JSON.parse(req.body.members);
      } catch (e) {
        return res.status(400).json({ message: 'members harus JSON valid' });
      }
    }
  } else if (Array.isArray(req.body.members)) {
    members = req.body.members;
  } else {
    return res.status(400).json({ message: 'members harus berupa array atau JSON string' });
  }

  // upload foto member (opsional)
  if (req.files?.memberPhotos) {
    const uploads = await Promise.all(
      req.files.memberPhotos.map(file =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'member_photos' },
            (err, result) => (err ? reject(err) : resolve(result.secure_url))
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        })
      )
    );

    members.forEach((m, i) => {
      if (uploads[i]) m.photoUrl = uploads[i];
    });
  }

  user.members = members;
}



    // ===============================
    // Update field text lain
    // ===============================
    const allowed = ['groupName','department','year','description'];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    });

    await user.save();

    // invalidate redis cache
    const redisClient = getRedis();
    await redisClient.del(`user:${targetId}`);

    res.json({ message: 'User updated', user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



// ===============================
// DELETE USER
// ===============================
const deleteUser = async (req, res) => {
  try {
    const id = req.user._id.toString(); // ambil id langsung dari token

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await User.deleteOne({ _id: id }); // hapus user

    // invalidate Redis cache
    const redisClient = getRedis();
    await redisClient.del(`user:${id}`);

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
