const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    originalTitle: String,
    overview: String,
    poster: String,
    backdrop: String,
    releaseDate: String,
    rating: { type: Number, default: 0 },
    voteCount: { type: Number, default: 0 },
    genres: [{ id: Number, name: String }],
    runtime: Number,
    status: String,
    tagline: String,
    categories: [{ type: String, index: true }],
    source: { type: String, default: 'TMDB' },
    imdbRating: String,
    imdbId: String,
    rtCritic: String,
    rtAudience: String,
    metacritic: String,
    awards: String,
    trailerKey: String,
    cast: [{ id: Number, name: String, character: String, profile: String }],
    isFree: { type: Boolean, default: false },
    watchOn: [String],
    popularity: { type: Number, default: 0 },
    lastSynced: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

movieSchema.index({ title: 'text', overview: 'text' });

module.exports = mongoose.model('Movie', movieSchema);
