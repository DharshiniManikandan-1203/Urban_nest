import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { realtimeService } from '../realtime/realtime.service.js';

const router = express.Router();

router.get('', authenticateToken, async (req, res) => {
  const { venture_id, block_id, floor_id, flat_id, status } = req.query;
  let sql = `
    SELECT t.*, 
           f.flat_number, fl.floor_name, fl.id as floor_id,
           b.name as block_name, b.id as block_id,
           v.name as venture_name, v.id as venture_id,
           u.full_name as user_name, u.email as user_email
    FROM helpdesk_tickets t
    JOIN flats f ON t.flat_id = f.id
    JOIN floors fl ON t.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    JOIN users u ON t.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (venture_id) { sql += " AND v.id = ?"; params.push(venture_id); }
  if (block_id) { sql += " AND b.id = ?"; params.push(block_id); }
  if (floor_id) { sql += " AND fl.id = ?"; params.push(floor_id); }
  if (flat_id) { sql += " AND t.flat_id = ?"; params.push(flat_id); }
  if (status) { sql += " AND t.status = ?"; params.push(status); }

  sql += " ORDER BY t.created_at DESC";
  const tickets = await query.all(sql, params);
  res.json({ success: true, data: tickets });
});

router.post('', authenticateToken, async (req, res) => {
  const { flat_id, floor_id, title, description, category, priority } = req.body;
  const tId = `tkt-${crypto.randomUUID().slice(0, 8)}`;

  const prio = priority || 'MEDIUM';
  const slaHours = prio === 'CRITICAL' ? 2 : (prio === 'HIGH' ? 4 : (prio === 'MEDIUM' ? 12 : 24));
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

  await query.run(`
    INSERT INTO helpdesk_tickets (
      id, flat_id, floor_id, user_id, title, description, category, priority, status, assigned_to_role, sla_hours, sla_deadline, escalation_level, is_escalated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 'FLOOR_MANAGER', ?, ?, 0, 0)
  `, [tId, flat_id, floor_id, req.user.id, title, description, category, prio, slaHours, slaDeadline]);

  const flat = await query.get("SELECT f.flat_number, b.venture_id FROM flats f JOIN floors fl ON f.floor_id = fl.id JOIN blocks b ON fl.block_id = b.id WHERE f.id = ?", [flat_id]);

  realtimeService.broadcast('TICKET_CREATED', {
    ticketId: tId,
    title,
    category,
    priority: prio,
    slaHours,
    flatNumber: flat?.flat_number,
    message: `🎫 New ${prio} Ticket #${tId.slice(0, 6)} opened for Flat ${flat?.flat_number}: "${title}"`
  });

  await realtimeService.logAudit({
    venture_id: flat?.venture_id,
    user_id: req.user.id,
    user_name: req.user.full_name,
    user_role: req.user.activeRole,
    action: 'TICKET_CREATED',
    resource_type: 'HELPDESK_TICKET',
    resource_id: tId,
    details: `Created ${prio} ticket "${title}" (SLA: ${slaHours}h)`
  });

  res.json({ success: true, message: 'Ticket created and routed to Floor Manager', ticketId: tId });
});

// Manual Ticket Escalation Climb
router.post('/:id/escalate', authenticateToken, async (req, res) => {
  const { reason } = req.body;
  const ticket = await query.get(`
    SELECT t.*, b.venture_id, f.flat_number 
    FROM helpdesk_tickets t
    JOIN flats f ON t.flat_id = f.id
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    WHERE t.id = ?
  `, [req.params.id]);

  if (!ticket) return res.status(404).json({ success: false, detail: 'Ticket not found' });

  const currentLevel = ticket.escalation_level || 0;
  const newLevel = currentLevel + 1;
  const nextRole = newLevel === 1 ? 'BLOCK_MANAGER' : (newLevel === 2 ? 'VENTURE_ADMIN' : 'SUPER_ADMIN');

  await query.run(`
    UPDATE helpdesk_tickets 
    SET escalation_level = ?, is_escalated = 1, assigned_to_role = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newLevel, nextRole, ticket.id]);

  const msg = `⚠️ Ticket #${ticket.id.slice(0, 6)} manually escalated by ${req.user.full_name} to ${nextRole} (${reason || 'Expedite resolution'})`;

  realtimeService.broadcast('TICKET_ESCALATED', {
    ticketId: ticket.id,
    title: ticket.title,
    assignedToRole: nextRole,
    escalationLevel: newLevel,
    message: msg
  });

  await realtimeService.logAudit({
    venture_id: ticket.venture_id,
    user_id: req.user.id,
    user_name: req.user.full_name,
    user_role: req.user.activeRole,
    action: 'TICKET_MANUALLY_ESCALATED',
    resource_type: 'HELPDESK_TICKET',
    resource_id: ticket.id,
    details: msg
  });

  res.json({ success: true, message: `Ticket escalated to ${nextRole}`, nextRole, escalationLevel: newLevel });
});

router.put('/:id/resolve', authenticateToken, async (req, res) => {
  const { status, resolution_notes } = req.body;

  await query.run(`
    UPDATE helpdesk_tickets 
    SET status = ?, resolution_notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status, resolution_notes, req.params.id]);

  realtimeService.broadcast('TICKET_STATUS_UPDATED', {
    ticketId: req.params.id,
    status,
    message: `✅ Ticket #${req.params.id.slice(0, 6)} marked as ${status}`
  });

  res.json({ success: true, message: `Ticket status updated to ${status}` });
});

export default router;
