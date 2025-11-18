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
// UPDATE USER PROFILE (TEXT ONLY)
// ===============================
const updateProfile = async (req, res) => {
  try {
    const targetId = req.user.id;
    const { groupName, email, department, year, description, phone } = req.body;

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update fields
    if (groupName !== undefined) user.groupName = groupName;
    if (email !== undefined) user.email = email;
    if (department !== undefined) user.department = department;
    if (year !== undefined) user.year = year;
    if (description !== undefined) user.description = description;
    if (phone !== undefined) user.phone = phone;
    
    user.isIncomplete = false;

    await user.save();

    // Invalidate redis cache
    const redisClient = getRedis();
    await redisClient.del(`user:${targetId}`);

    res.json({ 
      success: true,
      message: 'Profile updated successfully', 
      user: {
        _id: user._id,
        groupName: user.groupName,
        email: user.email,
        department: user.department,
        year: user.year,
        description: user.description,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// UPDATE USER WITH FILES
// ===============================
const updateUser = async (req, res) => {
  try {
    const targetId = req.user.id;
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

      // Upload foto member (opsional)
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
    const allowed = ['groupName','department','year','description','phone'];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    });

    user.isIncomplete = false;
    await user.save();

    // Invalidate redis cache
    const redisClient = getRedis();
    await redisClient.del(`user:${targetId}`);

    res.json({ 
      success: true,
      message: 'User updated successfully', 
      user 
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// ADD MEMBER
// ===============================
const addMember = async (req, res) => {
  try {
    const { name, nim, major, linkedinUrl, portfolioUrl } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newMember = {
      name,
      nim,
      major,
      linkedinUrl: linkedinUrl || '',
      portfolioUrl: portfolioUrl || '',
      photoUrl: ''
    };

    // Handle member photo upload if provided
    if (req.files?.memberPhoto) {
      const file = req.files.memberPhoto[0];
      const photoUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'member_photos' },
          (err, result) => (err ? reject(err) : resolve(result.secure_url))
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });
      newMember.photoUrl = photoUrl;
    }

    user.members.push(newMember);
    await user.save();

    // Invalidate cache
    const redisClient = getRedis();
    await redisClient.del(`user:${req.user.id}`);

    res.json({
      success: true,
      message: 'Member added successfully',
      member: newMember
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// UPDATE MEMBER
// ===============================
const updateMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { name, nim, major, linkedinUrl, portfolioUrl } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const member = user.members.id(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Update member data
    member.name = name;
    member.nim = nim;
    member.major = major;
    member.linkedinUrl = linkedinUrl || '';
    member.portfolioUrl = portfolioUrl || '';

    // Handle member photo upload if provided
    if (req.files?.memberPhoto) {
      const file = req.files.memberPhoto[0];
      const photoUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'member_photos' },
          (err, result) => (err ? reject(err) : resolve(result.secure_url))
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });
      member.photoUrl = photoUrl;
    }

    await user.save();

    // Invalidate cache
    const redisClient = getRedis();
    await redisClient.del(`user:${req.user.id}`);

    res.json({
      success: true,
      message: 'Member updated successfully',
      member
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// DELETE MEMBER
// ===============================
const deleteMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.members.pull(memberId);
    await user.save();

    // Invalidate cache
    const redisClient = getRedis();
    await redisClient.del(`user:${req.user.id}`);

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ===============================
// DELETE USER
// ===============================
const deleteUser = async (req, res) => {
  try {
    const id = req.user._id.toString();

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await User.deleteOne({ _id: id });

    // Invalidate Redis cache
    const redisClient = getRedis();
    await redisClient.del(`user:${id}`);

    res.json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  getUser,
  updateProfile,
  updateUser,
  addMember,
  updateMember,
  deleteMember,
  deleteUser
};