const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CreatorSubmission = require('../models/CreatorSubmission');
const { protect } = require('../middleware/auth');
const { dbReady } = require('../config/database');

const router = express.Router();
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`),
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/featured', async (req, res) => {
  if (!dbReady()) return res.json({ success: true, submissions: [] });
  const submissions = await CreatorSubmission.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(12);
  res.json({ success: true, submissions });
});

router.post('/submit', upload.single('poster'), async (req, res) => {
  try {
    if (!dbReady()) {
      return res.status(503).json({ success: false, message: 'Database required for creator uploads' });
    }

    const { creatorName, creatorEmail, title, description, genre, country, trailerUrl, watchUrl } = req.body;
    if (!creatorName || !title) {
      return res.status(400).json({ success: false, message: 'Creator name and title required' });
    }

    const submission = await CreatorSubmission.create({
      creatorName,
      creatorEmail,
      title,
      description,
      genre,
      country: country || 'Kenya',
      posterUrl: req.file ? `/uploads/${req.file.filename}` : req.body.posterUrl,
      trailerUrl,
      watchUrl,
      submittedBy: req.user?._id,
    });

    res.status(201).json({ success: true, submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
