const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { dbReady } = require('../config/database');
const { signToken } = require('../middleware/auth');

async function register({ name, email, password }) {
  if (!dbReady()) throw new Error('Database unavailable');
  const exists = await User.findOne({ email });
  if (exists) throw new Error('Email already registered');

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed });
  return { user: sanitize(user), token: signToken(user._id) };
}

async function login({ email, password }) {
  if (!dbReady()) throw new Error('Database unavailable');
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid email or password');
  }
  return { user: sanitize(user), token: signToken(user._id) };
}

function sanitize(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    watchlist: user.watchlist,
    watched: user.watched,
    reviews: user.reviews,
  };
}

module.exports = { register, login, sanitize };
