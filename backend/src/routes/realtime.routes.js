import express from 'express';
import { realtimeService } from '../realtime/realtime.service.js';

const router = express.Router();

// SSE Real-time stream endpoint
router.get('/stream', (req, res) => {
  realtimeService.addClient(res);
});

// Notifications history
router.get('/notifications', (req, res) => {
  res.json({
    success: true,
    data: realtimeService.notificationsHistory
  });
});

// Test manual broadcast trigger
router.post('/broadcast', (req, res) => {
  const { eventType, payload } = req.body;
  realtimeService.broadcast(eventType || 'COMMUNITY_ANNOUNCEMENT', payload || {});
  res.json({ success: true, message: 'Event broadcasted' });
});

export default router;
