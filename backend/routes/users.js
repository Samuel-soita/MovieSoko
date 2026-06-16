const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sanitize } = require('../services/authService');

router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
});

router.put('/watchlist', protect, async (req, res) => {
  req.user.watchlist = req.body.watchlist || [];
  await req.user.save();
  res.json({ success: true, watchlist: req.user.watchlist });
});

router.put('/watched', protect, async (req, res) => {
  req.user.watched = req.body.watched || [];
  await req.user.save();
  res.json({ success: true, watched: req.user.watched });
});

router.put('/reviews', protect, async (req, res) => {
  req.user.reviews = req.body.reviews || [];
  await req.user.save();
  res.json({ success: true, reviews: req.user.reviews });
});

router.post('/sync', protect, async (req, res) => {
  const { watchlist, watched, reviews } = req.body;
  if (watchlist) req.user.watchlist = watchlist.map((w) => ({ tmdbId: w.id || w.tmdbId, title: w.title, poster: w.poster }));
  if (watched) req.user.watched = watched.map((w) => ({ tmdbId: w.id || w.tmdbId, title: w.title }));
  if (reviews) req.user.reviews = reviews;
  await req.user.save();
  res.json({ success: true, user: sanitize(req.user) });
});

module.exports = router;
