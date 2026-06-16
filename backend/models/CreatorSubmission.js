const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    creatorName: { type: String, required: true },
    creatorEmail: String,
    title: { type: String, required: true },
    description: String,
    genre: String,
    country: { type: String, default: 'Kenya' },
    posterUrl: String,
    trailerUrl: String,
    watchUrl: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreatorSubmission', submissionSchema);
