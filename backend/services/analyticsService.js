const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'kenya-analytics.json');

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch {
    /* ignore */
  }
  return { movies: {} };
}

function save(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function trackEvent(tmdbId, event) {
  const data = load();
  const key = String(tmdbId);
  if (!data.movies[key]) {
    data.movies[key] = { clicks: 0, searches: 0, watchlist: 0, score: 0 };
  }
  const entry = data.movies[key];
  if (entry[event] !== undefined) entry[event]++;
  entry.score = entry.clicks * 3 + entry.searches * 2 + entry.watchlist * 4;
  entry.lastEvent = Date.now();
  save(data);
  return entry;
}

function getKenyaTrendingIds(limit = 20) {
  const data = load();
  return Object.entries(data.movies)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([id]) => parseInt(id, 10));
}

function getAnalytics() {
  return load();
}

function getKenyaTop10() {
  const data = load();
  return Object.entries(data.movies)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10)
    .map(([id, stats]) => ({ tmdbId: parseInt(id, 10), ...stats }));
}

function getWeeklyStats() {
  const data = load();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = Object.entries(data.movies).filter(([, s]) => (s.lastEvent || 0) > weekAgo);
  return {
    totalEvents: recent.reduce((sum, [, s]) => sum + s.clicks + s.searches + s.watchlist, 0),
    uniqueMovies: recent.length,
    topSearches: recent.sort((a, b) => b[1].searches - a[1].searches).slice(0, 5).map(([id, s]) => ({ tmdbId: parseInt(id, 10), searches: s.searches })),
  };
}

module.exports = { trackEvent, getKenyaTrendingIds, getAnalytics, getKenyaTop10, getWeeklyStats };
