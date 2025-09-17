// middleware/validation.js
const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation rules for user registration
const validateRegistration = [
  body('groupName')
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Group name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('department')
    .notEmpty()
    .withMessage('Department is required'),
  body('year')
    .isInt({ min: 2000, max: 2030 })
    .withMessage('Please provide a valid year'),
  handleValidationErrors
];

// Validation rules for project creation
const validateProject = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('summary')
    .notEmpty()
    .withMessage('Summary is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Summary must be between 10 and 500 characters'),
  body('evaluation')
    .notEmpty()
    .withMessage('Evaluation is required')
    .isLength({ min: 10 })
    .withMessage('Evaluation must be at least 10 characters long'),
  body('suggestion')
    .notEmpty()
    .withMessage('Suggestion is required')
    .isLength({ min: 10 })
    .withMessage('Suggestion must be at least 10 characters long'),
  body('theme')
    .isIn(['Kesehatan', 'Pengelolaan Sampah', 'Smart City', 'Transportasi Ramah Lingkungan'])
    .withMessage('Please select a valid theme'),
  handleValidationErrors
];

// Validation rules for comments
const validateComment = [
  body('text')
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  handleValidationErrors
];

// Validation rules for ratings
const validateRating = [
  body('score')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateProject,
  validateComment,
  validateRating
};