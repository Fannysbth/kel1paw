const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: function() {
      // wajib kalau bukan Google atau profile sudah lengkap
      return !this.googleId || this.isIncomplete === false;
    },
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
    minlength: 6
  },
  googleId: {
    type: String,
    sparse: true
  },
  department: {
    type: String,
    required: function() {
      return !this.googleId || this.isIncomplete === false;
    }
  },
  year: {
    type: Number,
    required: function() {
      return !this.googleId || this.isIncomplete === false;
    }
  },
  description: {
    type: String
  },
  teamPhotoUrl: {
    type: String
  },
  members: [{
    name: { type: String, required: true },
    nim: { type: String, required: true },
    major: { type: String, required: true },
    linkedinUrl: { type: String },
    portfolioUrl: { type: String },
    photoUrl: { type: String }
  }],
  isIncomplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password sebelum save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
