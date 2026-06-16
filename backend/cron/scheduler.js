const cron = require('node-cron');
const { syncAllMovies } = require('../services/movieService');

function startCronJobs() {
  const schedule = process.env.SYNC_CRON || '0 */6 * * *';

  cron.schedule(schedule, async () => {
    console.log('[Cron] Scheduled sync started');
    try {
      await syncAllMovies();
    } catch (err) {
      console.error('[Cron] Sync failed:', err.message);
    }
  });

  console.log(`[Cron] Movie sync scheduled: ${schedule}`);
}

module.exports = { startCronJobs };
