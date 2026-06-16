require('dotenv').config();
const { syncAllMovies } = require('../services/movieService');

syncAllMovies()
  .then((result) => {
    console.log('[Manual Sync]', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Manual Sync] Failed:', err);
    process.exit(1);
  });
