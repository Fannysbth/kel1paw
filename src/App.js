require('dotenv').config();
const express = require('express');

const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const multer = require('multer');
const upload = multer();
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { protect } = require('./middleware/auth'); 

// Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/project');
const commentRoutes = require('./routes/comments');
const ratingRoutes = require('./routes/ratings');
const requestRoutes = require('./routes/requests');
const userRoutes = require('./routes/users');

// Google OAuth
require('./config/googleOAuth');

const app = express();
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Connecting to Redis...');
    await connectRedis();

    app.use(passport.initialize());

    // Routes
    app.use('/api/auth',authRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/comments',  commentRoutes);
    app.use('/api/ratings',  ratingRoutes);
    app.use('/api/requests', requestRoutes);
    app.use('/api/users', userRoutes);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
