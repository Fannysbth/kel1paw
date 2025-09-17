// middleware/fixMultipart.js
const fixMultipartBody = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      // Pastikan semua field text dikirim sebagai string, bukan array
      if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key][0];
      }
    }
  }
  next();
};

module.exports = fixMultipartBody;
