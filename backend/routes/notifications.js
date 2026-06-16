const express = require('express');
const router = express.Router();
const { saveSubscription, sendNewReleaseNotification, VAPID_PUBLIC } = require('../services/notificationService');
const { protect } = require('../middleware/auth');

router.get('/vapid-key', (req, res) => {
  res.json({ success: true, publicKey: VAPID_PUBLIC || null });
});

router.post('/subscribe', async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ success: false, message: 'Subscription required' });
  await saveSubscription(subscription, req.user?._id);
  res.json({ success: true, message: 'Subscribed to new release alerts' });
});

router.post('/new-releases', async (req, res) => {
  const result = await sendNewReleaseNotification(req.body);
  res.json({ success: true, ...result });
});

module.exports = router;
