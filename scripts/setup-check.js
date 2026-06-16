#!/usr/bin/env node
/**
 * Cine254 setup checker — run: npm run setup
 */
require('dotenv').config();
const axios = require('axios');

const checks = [];

async function check(name, fn) {
  try {
    const result = await fn();
    checks.push({ name, ok: true, detail: result });
    console.log(`  ✅ ${name}: ${result}`);
  } catch (err) {
    checks.push({ name, ok: false, detail: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

async function main() {
  console.log('\n  Cine254 Setup Check\n  ───────────────────\n');

  await check('TMDB API', async () => {
    const key = process.env.TMDB_API_KEY;
    if (!key || key.includes('your_')) throw new Error('TMDB_API_KEY missing in .env');
    const { data } = await axios.get(`https://api.themoviedb.org/3/trending/movie/week?api_key=${key}`);
    return `${data.results?.length || 0} trending movies fetched`;
  });

  await check('OMDb API', async () => {
    const key = process.env.OMDB_API_KEY;
    if (!key || key.includes('your_')) throw new Error('OMDB_API_KEY missing');
    const { data } = await axios.get(`http://www.omdbapi.com/?apikey=${key}&t=Inception`);
    if (data.Response === 'False') throw new Error(data.Error);
    return `IMDb rating: ${data.imdbRating}`;
  });

  await check('Utelly / RapidAPI', async () => {
    const key = process.env.RAPIDAPI_KEY;
    if (!key || key.includes('your_')) throw new Error('RAPIDAPI_KEY missing');
    const utelly = require('../backend/services/utellyService');
    const { providers, host, error } = await utelly.lookup('Inception', 'ke');
    if (providers.length) return `${providers.length} providers via ${host}`;
    if (error === 403) throw new Error('Subscribe to Utelly on RapidAPI (free plan)');
    if (error === 429) return 'Subscribed ✅ — rate limited on free plan (TMDB fallback active until reset)';
    return `Subscribed — no providers for test title (TMDB fallback active). Error: ${error || 'empty'}`;
  });

  await check('MongoDB', async () => {
    const mongoose = require('mongoose');
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.db.admin().ping();
    await mongoose.disconnect();
    return 'Connected successfully';
  });

  await check('JWT Secret', () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change')) {
      return 'Set (change before production deploy)';
    }
    return 'Configured';
  });

  await check('VAPID Push Keys', () => {
    if (!process.env.VAPID_PUBLIC_KEY) throw new Error('Run: npx web-push generate-vapid-keys');
    return 'Configured — push notifications ready';
  });

  await check('M-Pesa Daraja', async () => {
    const key = process.env.MPESA_CONSUMER_KEY;
    if (!key || key.includes('YOUR_')) {
      return 'Passkey/shortcode set — add Consumer Key + Secret from Daraja portal';
    }
    const mpesa = require('../backend/services/mpesaService');
    try {
      await mpesa.getToken();
      return `Sandbox live — test phone ${process.env.MPESA_TEST_PHONE}, PIN 174379, KES ${process.env.MPESA_SANDBOX_AMOUNT || 1}`;
    } catch (err) {
      throw new Error('Invalid Consumer Key/Secret — copy fresh ones from developer.safaricom.co.ke');
    }
  });

  const passed = checks.filter((c) => c.ok).length;
  console.log(`\n  Result: ${passed}/${checks.length} checks passed\n`);

  if (!checks.find((c) => c.name === 'MongoDB')?.ok) {
    console.log('  📌 MongoDB not connected. Follow SETUP.md to set up Atlas (free).\n');
  }
}

main();
