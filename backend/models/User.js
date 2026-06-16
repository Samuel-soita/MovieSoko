const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    watchlist: [{ tmdbId: Number, title: String, poster: String, addedAt: { type: Date, default: Date.now } }],
    watched: [{ tmdbId: Number, title: String, watchedAt: { type: Date, default: Date.now } }],
    reviews: [{
      tmdbId: Number,
      stars: Number,
      text: String,
      createdAt: { type: Date, default: Date.now },
    }],
    pushSubscription: { type: Object },
    role: { type: String, enum: ['user', 'creator', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
