import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/catalog', async (req, res) => {
  const catalog = await query.all("SELECT * FROM amenity_catalog ORDER BY category, name ASC");
  res.json({ success: true, data: catalog });
});

router.get('/venture/:venture_id', authenticateToken, async (req, res) => {
  const amenities = await query.all(`
    SELECT va.*, 
           ac.name as catalog_name, ac.category, ac.icon_name, ac.description as catalog_description,
           v.name as venture_name
    FROM venture_amenities va
    JOIN amenity_catalog ac ON va.amenity_catalog_id = ac.id
    JOIN ventures v ON va.venture_id = v.id
    WHERE va.venture_id = ?
    ORDER BY va.is_active DESC, ac.name ASC
  `, [req.params.venture_id]);
  res.json({ success: true, data: amenities });
});

router.post('/venture', authenticateToken, requireRoles(['SUPER_ADMIN', 'VENTURE_ADMIN']), async (req, res) => {
  const {
    venture_id, amenity_catalog_id, custom_name, max_capacity_per_slot,
    slot_duration_minutes, opening_time, closing_time, booking_fee, requires_approval
  } = req.body;

  const vaId = `va-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await query.run(`
      INSERT INTO venture_amenities (
        id, venture_id, amenity_catalog_id, custom_name, max_capacity_per_slot,
        slot_duration_minutes, opening_time, closing_time, booking_fee, requires_approval, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(venture_id, amenity_catalog_id) DO UPDATE SET
        custom_name = excluded.custom_name,
        max_capacity_per_slot = excluded.max_capacity_per_slot,
        slot_duration_minutes = excluded.slot_duration_minutes,
        opening_time = excluded.opening_time,
        closing_time = excluded.closing_time,
        booking_fee = excluded.booking_fee,
        is_active = 1
    `, [
      vaId, venture_id, amenity_catalog_id, custom_name,
      max_capacity_per_slot || 20, slot_duration_minutes || 60,
      opening_time || '06:00', closing_time || '22:00',
      booking_fee || 0.0, requires_approval ? 1 : 0
    ]);
    res.json({ success: true, message: 'Amenity configured for venture successfully' });
  } catch (err) {
    res.status(400).json({ success: false, detail: err.message });
  }
});

export default router;
