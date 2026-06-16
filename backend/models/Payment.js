const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: { type: String, required: true },
    tmdbId: { type: Number, required: true },
    movieTitle: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KES' },
    checkoutRequestId: String,
    merchantRequestId: String,
    mpesaReceipt: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
