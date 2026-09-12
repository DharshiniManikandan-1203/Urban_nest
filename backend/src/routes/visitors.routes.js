import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { realtimeService } from '../realtime/realtime.service.js';

const router = express.Router();

// List visitors
router.get('', authenticateToken, async (req, res) => {
  const { venture_id, status, flat_id } = req.query;
  let sql = `
    SELECT vis.*, f.flat_number, fl.floor_name, b.name as block_name, v.name as venture_name,
           u.full_name as host_name, u.phone as host_phone
    FROM visitors vis
    JOIN flats f ON vis.flat_id = f.id
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON vis.venture_id = v.id
    JOIN users u ON vis.created_by_user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (venture_id) {
    sql += " AND vis.venture_id = ?";
    params.push(venture_id);
  }
  if (status) {
    sql += " AND vis.status = ?";
    params.push(status);
  }
  if (flat_id) {
    sql += " AND vis.flat_id = ?";
    params.push(flat_id);
  }

  sql += " ORDER BY vis.created_at DESC LIMIT 100";

  const visitors = await query.all(sql, params);
  res.json({ success: true, data: visitors });
});

// Gate stats
router.get('/stats', authenticateToken, async (req, res) => {
  const { venture_id } = req.query;
  const where = venture_id ? "WHERE venture_id = ?" : "";
  const params = venture_id ? [venture_id] : [];

  const total = await query.get(`SELECT COUNT(*) as count FROM visitors ${where}`, params);
  const checkedIn = await query.get(`SELECT COUNT(*) as count FROM visitors ${where ? where + ' AND' : 'WHERE'} status = 'CHECKED_IN'`, params);
  const approved = await query.get(`SELECT COUNT(*) as count FROM visitors ${where ? where + ' AND' : 'WHERE'} status = 'APPROVED'`, params);
  const delivery = await query.get(`SELECT COUNT(*) as count FROM visitors ${where ? where + ' AND' : 'WHERE'} visitor_type = 'DELIVERY'`, params);

  res.json({
    success: true,
    data: {
      total: total.count,
      currentlyInside: checkedIn.count,
      expected: approved.count,
      deliveries: delivery.count
    }
  });
});

// Resident Pre-approves Visitor
router.post('/pre-approve', authenticateToken, async (req, res) => {
  const { flat_id, venture_id, visitor_name, visitor_phone, visitor_type, vehicle_number, valid_hours, notes } = req.body;

  if (!flat_id || !venture_id || !visitor_name || !visitor_phone) {
    return res.status(400).json({ success: false, detail: 'Flat, venture, visitor name, and phone are required' });
  }

  const passId = `vis-${crypto.randomUUID().slice(0, 8)}`;
  const passCode = `PASS-${Math.floor(1000 + Math.random() * 9000)}`;
  const validUntil = new Date(Date.now() + (parseInt(valid_hours) || 24) * 60 * 60 * 1000).toISOString();

  try {
    await query.run(`
      INSERT INTO visitors (id, flat_id, venture_id, created_by_user_id, visitor_name, visitor_phone, visitor_type, vehicle_number, pass_code, valid_until, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)
    `, [passId, flat_id, venture_id, req.user.id, visitor_name, visitor_phone, visitor_type || 'GUEST', vehicle_number || null, passCode, validUntil, notes || null]);

    const created = await query.get("SELECT * FROM visitors WHERE id = ?", [passId]);

    // Real-time broadcast
    realtimeService.broadcast('VISITOR_PRE_APPROVED', {
      passId,
      passCode,
      visitorName: visitor_name,
      visitorType: visitor_type || 'GUEST',
      hostName: req.user.full_name,
      ventureId: venture_id
    });

    await realtimeService.logAudit({
      venture_id,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_role: req.user.activeRole,
      action: 'VISITOR_PRE_APPROVED',
      resource_type: 'VISITOR_PASS',
      resource_id: passId,
      details: `Pre-approved ${visitor_type || 'GUEST'} pass for ${visitor_name} (${passCode})`
    });

    res.status(201).json({ success: true, message: 'Visitor pass created', data: created });
  } catch (err) {
    res.status(500).json({ success: false, detail: err.message });
  }
});

// Guard Check-in
router.post('/check-in', authenticateToken, async (req, res) => {
  const { pass_code, visitor_phone } = req.body;
  if (!pass_code && !visitor_phone) {
    return res.status(400).json({ success: false, detail: 'Pass code or phone number required' });
  }

  const visitor = await query.get(
    "SELECT * FROM visitors WHERE (pass_code = ? OR visitor_phone = ?) AND status = 'APPROVED'",
    [pass_code ? pass_code.trim().toUpperCase() : '', visitor_phone ? visitor_phone.trim() : '']
  );

  if (!visitor) {
    return res.status(404).json({ success: false, detail: 'No approved active pass found matching these credentials' });
  }

  const now = new Date().toISOString();
  await query.run("UPDATE visitors SET status = 'CHECKED_IN', check_in_time = ?, updated_at = ? WHERE id = ?", [now, now, visitor.id]);

  const flat = await query.get("SELECT flat_number FROM flats WHERE id = ?", [visitor.flat_id]);

  realtimeService.broadcast('GATE_ENTRY_RECORDED', {
    passId: visitor.id,
    passCode: visitor.pass_code,
    visitorName: visitor.visitor_name,
    visitorType: visitor.visitor_type,
    vehicleNumber: visitor.vehicle_number,
    flatNumber: flat?.flat_number,
    checkInTime: now,
    message: `🚪 Visitor ${visitor.visitor_name} (${visitor.visitor_type}) checked in for Unit ${flat?.flat_number}`
  });

  await realtimeService.logAudit({
    venture_id: visitor.venture_id,
    user_id: req.user.id,
    user_name: req.user.full_name,
    user_role: req.user.activeRole,
    action: 'GATE_CHECK_IN',
    resource_type: 'VISITOR_PASS',
    resource_id: visitor.id,
    details: `Guard validated check-in for ${visitor.visitor_name} (${visitor.pass_code}) to Unit ${flat?.flat_number}`
  });

  res.json({ success: true, message: `Checked in ${visitor.visitor_name} successfully`, data: { ...visitor, status: 'CHECKED_IN', check_in_time: now } });
});

// Guard Check-out
router.post('/check-out', authenticateToken, async (req, res) => {
  const { visitor_id } = req.body;
  const visitor = await query.get("SELECT * FROM visitors WHERE id = ?", [visitor_id]);
  if (!visitor) return res.status(404).json({ success: false, detail: 'Visitor not found' });

  const now = new Date().toISOString();
  await query.run("UPDATE visitors SET status = 'CHECKED_OUT', check_out_time = ?, updated_at = ? WHERE id = ?", [now, now, visitor.id]);

  realtimeService.broadcast('GATE_EXIT_RECORDED', {
    passId: visitor.id,
    visitorName: visitor.visitor_name,
    checkOutTime: now,
    message: `👋 Visitor ${visitor.visitor_name} checked out of the premises`
  });

  await realtimeService.logAudit({
    venture_id: visitor.venture_id,
    user_id: req.user.id,
    user_name: req.user.full_name,
    user_role: req.user.activeRole,
    action: 'GATE_CHECK_OUT',
    resource_type: 'VISITOR_PASS',
    resource_id: visitor.id,
    details: `Guard registered exit for ${visitor.visitor_name}`
  });

  res.json({ success: true, message: `Checked out ${visitor.visitor_name}` });
});

export default router;
