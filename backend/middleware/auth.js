const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { dbReady } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'cine254-dev-secret-change-in-production';

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
}

async function protect(req, res, next) {
  if (!dbReady()) {
    return res.status(503).json({ success: false, message: 'Database required for accounts. Set MONGODB_URI.' });
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Login required' });
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { signToken, protect, JWT_SECRET };
