const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const User = require('../models/User');
const { dbReady } = require('../config/database');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBS_FILE = path.join(__dirname, '../data/push-subscriptions.json');

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:hello@cine254.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

function loadLocalSubs() {
  try {
    if (fs.existsSync(SUBS_FILE)) return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
  } catch { /* ignore */ }
  return [];
}

function saveLocalSubs(subs) {
  const dir = path.dirname(SUBS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
}

async function saveSubscription(subscription, userId) {
  if (dbReady() && userId) {
    await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
  }
  const subs = loadLocalSubs();
  if (!subs.find((s) => s.endpoint === subscription.endpoint)) {
    subs.push(subscription);
    saveLocalSubs(subs);
  }
}

async function sendNewReleaseNotification(payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { sent: 0, message: 'Configure VAPID keys for push notifications' };
  }

  const message = JSON.stringify({
    title: payload.title || '🎬 New on Cine254',
    body: payload.body || 'Fresh movies just dropped!',
    url: payload.url || '/',
  });

  let sent = 0;
  const subs = loadLocalSubs();

  if (dbReady()) {
    const users = await User.find({ pushSubscription: { $exists: true, $ne: null } });
    users.forEach((u) => subs.push(u.pushSubscription));
  }

  const unique = [...new Map(subs.map((s) => [s.endpoint, s])).values()];

  for (const sub of unique) {
    try {
      await webpush.sendNotification(sub, message);
      sent++;
    } catch {
      /* expired subscription */
    }
  }

  return { sent };
}

module.exports = { saveSubscription, sendNewReleaseNotification, VAPID_PUBLIC };
