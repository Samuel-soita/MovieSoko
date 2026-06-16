require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const movieRoutes = require('./routes/movies');
const { connectDB, dbReady } = require('./config/database');
const { startCronJobs } = require('./cron/scheduler');
const { syncAllMovies } = require('./services/movieService');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.APP_URL,
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.some((o) => origin === o || origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Cine254',
    version: '2.0.0',
    tagline: 'The smartest movie discovery platform for Kenya',
    mongodb: dbReady() ? 'connected' : 'disconnected',
    features: {
      mpesa: !!process.env.MPESA_CONSUMER_KEY,
      push: !!process.env.VAPID_PUBLIC_KEY,
      affiliates: !!(process.env.AFFILIATE_NETFLIX || process.env.AFFILIATE_SHOWMAX),
    },
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/creators', require('./routes/creators'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/movies', movieRoutes);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

async function bootstrap() {
  await connectDB();
  startCronJobs();

  if (dbReady()) {
    const movieCount = await require('mongoose').connection.db.collection('movies').countDocuments();
    if (movieCount === 0 && process.env.TMDB_API_KEY && process.env.TMDB_API_KEY !== 'your_tmdb_api_key_here') {
      console.log('[Boot] Empty database — running initial sync...');
      syncAllMovies().catch((e) => console.error('[Boot] Initial sync failed:', e.message));
    }
  }

  app.listen(PORT, () => {
    console.log(`\n  Cine254 v2.0 → http://localhost:${PORT}\n`);
  });
}

bootstrap();
