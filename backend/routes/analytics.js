const express = require('express');
const router = express.Router();
const { trackEvent, getAnalytics, getKenyaTop10, getWeeklyStats } = require('../services/analyticsService');
const tmdbService = require('../services/tmdbService');

router.post('/track', (req, res) => {
  const { tmdbId, event } = req.body;
  if (tmdbId === undefined || tmdbId === null || !['clicks', 'searches', 'watchlist'].includes(event)) {
    return res.status(400).json({ success: false, message: 'Invalid track payload' });
  }
  if (!tmdbId) return res.json({ success: true, message: 'Search tracked' });
  const result = trackEvent(tmdbId, event);
  res.json({ success: true, analytics: result });
});

router.get('/kenya', (req, res) => {
  res.json({ success: true, data: getAnalytics(), weekly: getWeeklyStats() });
});

router.get('/kenya/top10', async (req, res) => {
  try {
    const top = getKenyaTop10();
    const movies = [];

    for (const entry of top) {
      try {
        const details = await tmdbService.fetchMovieDetails(entry.tmdbId);
        movies.push({
          id: entry.tmdbId,
          title: details.title,
          poster: details.poster,
          rating: details.rating,
          score: entry.score,
          clicks: entry.clicks,
          searches: entry.searches,
          watchlist: entry.watchlist,
        });
      } catch { /* skip */ }
    }

    res.json({ success: true, movies, weekly: getWeeklyStats() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
