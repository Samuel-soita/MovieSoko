const express = require('express');
const router = express.Router();
const mpesaService = require('../services/mpesaService');
const { dbReady } = require('../config/database');

const DEFAULT_PRICE = parseInt(process.env.MPESA_MOVIE_PRICE || '50', 10);

router.get('/price', (req, res) => {
  const sandbox = process.env.MPESA_ENV !== 'production';
  res.json({
    success: true,
    amount: sandbox ? parseInt(process.env.MPESA_SANDBOX_AMOUNT || '1', 10) : DEFAULT_PRICE,
    displayAmount: DEFAULT_PRICE,
    currency: 'KES',
    sandbox,
    testPhone: process.env.MPESA_TEST_PHONE || '254708374149',
  });
});

router.post('/stk-push', async (req, res) => {
  try {
    const { phone, tmdbId, movieTitle, amount } = req.body;
    if (!tmdbId) {
      return res.status(400).json({ success: false, message: 'Movie ID required' });
    }

    const result = await mpesaService.initiateSTK({
      phone: phone || process.env.MPESA_TEST_PHONE,
      amount: amount || DEFAULT_PRICE,
      tmdbId,
      movieTitle: movieTitle || 'Movie',
      userId: req.user?._id,
    });

    res.json({ success: true, ...result, currency: 'KES' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.response?.data?.errorMessage || err.message });
  }
});

router.post('/query/:checkoutRequestId', async (req, res) => {
  try {
    const status = await mpesaService.querySTKStatus(req.params.checkoutRequestId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.response?.data?.errorMessage || err.message });
  }
});

router.post('/callback', async (req, res) => {
  await mpesaService.handleCallback(req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

router.get('/status/:checkoutRequestId', async (req, res) => {
  const Payment = require('../models/Payment');
  const payment = dbReady()
    ? await Payment.findOne({ checkoutRequestId: req.params.checkoutRequestId })
    : null;
  res.json({ success: true, payment });
});

module.exports = router;
