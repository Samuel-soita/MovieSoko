const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cine254';

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    });
    console.log('[DB] MongoDB connected');
    return true;
  } catch (err) {
    console.warn('[DB] MongoDB unavailable — API-only mode:', err.message);
    return false;
  }
}

function dbReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, dbReady };
