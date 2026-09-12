import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('', authenticateToken, async (req, res) => {
  const { venture_id, flat_id, user_id } = req.query;
  let sql = `
    SELECT ab.*, 
           va.custom_name as amenity_name, va.booking_fee,
           ac.name as catalog_name, ac.category, ac.icon_name,
           f.flat_number, fl.floor_name, b.name as block_name, v.name as venture_name, v.id as venture_id,
           u.full_name as user_name, u.email as user_email
    FROM amenity_bookings ab
    JOIN venture_amenities va ON ab.venture_amenity_id = va.id
    JOIN amenity_catalog ac ON va.amenity_catalog_id = ac.id
    JOIN flats f ON ab.flat_id = f.id
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    JOIN users u ON ab.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (venture_id) { sql += " AND v.id = ?"; params.push(venture_id); }
  if (flat_id) { sql += " AND ab.flat_id = ?"; params.push(flat_id); }
  if (user_id) { sql += " AND ab.user_id = ?"; params.push(user_id); }

  sql += " ORDER BY ab.booking_date DESC, ab.start_time DESC";
  const bookings = await query.all(sql, params);
  res.json({ success: true, data: bookings });
});

router.post('', authenticateToken, async (req, res) => {
  const { venture_amenity_id, flat_id, booking_date, start_time, end_time, attendee_count, notes } = req.body;

  const va = await query.get(`
    SELECT va.*, ac.name as catalog_name 
    FROM venture_amenities va
    JOIN amenity_catalog ac ON va.amenity_catalog_id = ac.id
    WHERE va.id = ? AND va.is_active = 1
  `, [venture_amenity_id]);

  if (!va) return res.status(404).json({ success: false, detail: 'Amenity not available' });

  const capacityRow = await query.get(`
    SELECT SUM(attendee_count) as total_booked 
    FROM amenity_bookings 
    WHERE venture_amenity_id = ? AND booking_date = ? AND start_time = ? AND status != 'CANCELLED'
  `, [venture_amenity_id, booking_date, start_time]);

  const currentOccupancy = capacityRow.total_booked || 0;
  const count = attendee_count || 1;

  if (currentOccupancy + count > va.max_capacity_per_slot) {
    return res.status(400).json({
      success: false,
      detail: `Slot is full. Capacity is ${va.max_capacity_per_slot}, currently ${currentOccupancy} booked.`
    });
  }

  const bookingId = `bk-${crypto.randomUUID().slice(0, 8)}`;
  const qrPass = `PASS-${va.catalog_name.slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

  await query.run(`
    INSERT INTO amenity_bookings (
      id, venture_amenity_id, user_id, flat_id, booking_date, start_time,
      end_time, attendee_count, status, qr_pass_code, amount_paid, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?)
  `, [
    bookingId, venture_amenity_id, req.user.id, flat_id,
    booking_date, start_time, end_time, count,
    qrPass, va.booking_fee, notes
  ]);

  res.json({
    success: true,
    message: 'Amenity booking confirmed!',
    booking: {
      id: bookingId,
      qrPassCode: qrPass,
      status: 'CONFIRMED',
      amenity: va.custom_name || va.catalog_name,
      bookingDate: booking_date,
      timeSlot: `${start_time} - ${end_time}`,
      attendees: count
    }
  });
});

router.get('/verify-qr/:code', authenticateToken, async (req, res) => {
  const booking = await query.get(`
    SELECT ab.*, 
           va.custom_name as amenity_name,
           f.flat_number, b.name as block_name, v.name as venture_name,
           u.full_name as resident_name, u.phone as resident_phone
    FROM amenity_bookings ab
    JOIN venture_amenities va ON ab.venture_amenity_id = va.id
    JOIN flats f ON ab.flat_id = f.id
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    JOIN users u ON ab.user_id = u.id
    WHERE ab.qr_pass_code = ?
  `, [req.params.code]);

  if (!booking) return res.status(404).json({ success: false, detail: 'Invalid QR Pass Code' });
  res.json({ success: true, valid: true, data: booking });
});

export default router;
