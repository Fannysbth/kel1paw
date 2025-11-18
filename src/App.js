require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

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

// Logger
app.use(morgan('dev'));

// CORS
app.use(cors({ 
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));




// Cookie parser
app.use(cookieParser());

// Passport
app.use(passport.initialize());

// Health check
app.get('/api/health', (req, res) => res.status(200).json({ message: 'Server is running!' }));

// **PERBAIKAN: JSON parser untuk semua route KECUALI /api/projects yang perlu multipart**
app.use((req, res, next) => {
  // Skip JSON parsing untuk project routes yang upload file
  if (req.path === '/api/projects' && req.method === 'POST') {
    return next();
  }
  if (req.path.match(/^\/api\/projects\/[^/]+$/) && req.method === 'PUT') {
    return next();
  }
  if (req.path.match(/^\/api\/projects\/[^/]+$/) && req.method === 'GET') {
  return next();
}

  
  // Parse JSON untuk route lainnya
  express.json({ limit: '10mb' })(req, res, () => {
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);

// **PERBAIKAN: Error handler yang mengirim JSON valid**
app.use((err, req, res, next) => {
  console.error('=== GLOBAL ERROR HANDLER ===');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  console.error('Request path:', req.path);
  console.error('Request method:', req.method);
  
  // Pastikan response adalah JSON valid
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  
  // **CRITICAL: Pastikan tidak ada response yang sudah dikirim**
  if (res.headersSent) {
    console.error('Headers already sent, delegating to default error handler');
    return next(err);
  }
  
  res.status(statusCode).json({ 
    message: message,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.toString()
    })
  });
});

// Start server
const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Connecting to Redis...');
    await connectRedis();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();