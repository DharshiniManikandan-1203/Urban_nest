import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('', authenticateToken, async (req, res) => {
  const { venture_id, block_id, floor_id, status } = req.query;
  let sql = `
    SELECT f.*, fl.floor_number, fl.floor_name,
           b.id as block_id, b.name as block_name, b.code as block_code,
           v.id as venture_id, v.name as venture_name, v.code as venture_code,
           o.id as owner_id, o.full_name as owner_name, o.email as owner_email, o.phone as owner_phone,
           fo.ownership_percentage, fo.deed_reference_number
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    LEFT JOIN flat_ownerships fo ON f.id = fo.flat_id
    LEFT JOIN owners o ON fo.owner_id = o.id
    WHERE 1=1
  `;
  const params = [];
  if (venture_id) { sql += " AND v.id = ?"; params.push(venture_id); }
  if (block_id) { sql += " AND b.id = ?"; params.push(block_id); }
  if (floor_id) { sql += " AND fl.id = ?"; params.push(floor_id); }
  if (status) { sql += " AND f.occupancy_status = ?"; params.push(status); }

  sql += " ORDER BY v.name ASC, b.code ASC, fl.floor_number ASC, f.flat_number ASC";
  const flats = await query.all(sql, params);
  res.json({ success: true, data: flats });
});

router.get('/:id', authenticateToken, async (req, res) => {
  const flat = await query.get(`
    SELECT f.*, fl.floor_number, fl.floor_name,
           b.id as block_id, b.name as block_name, b.code as block_code,
           v.id as venture_id, v.name as venture_name, v.code as venture_code, v.maintenance_rate,
           o.id as owner_id, o.full_name as owner_name, o.email as owner_email, o.phone as owner_phone,
           fo.ownership_percentage, fo.deed_reference_number
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    LEFT JOIN flat_ownerships fo ON f.id = fo.flat_id
    LEFT JOIN owners o ON fo.owner_id = o.id
    WHERE f.id = ?
  `, [req.params.id]);

  if (!flat) return res.status(404).json({ success: false, detail: 'Flat not found' });

  flat.invoices = await query.all("SELECT * FROM maintenance_invoices WHERE flat_id = ? ORDER BY due_date DESC", [flat.id]);
  flat.tickets = await query.all("SELECT * FROM helpdesk_tickets WHERE flat_id = ? ORDER BY created_at DESC", [flat.id]);

  res.json({ success: true, data: flat });
});

router.put('/:id/status', authenticateToken, async (req, res) => {
  const { occupancy_status } = req.body;
  await query.run("UPDATE flats SET occupancy_status = ? WHERE id = ?", [occupancy_status, req.params.id]);
  res.json({ success: true, message: 'Flat occupancy status updated' });
});

router.put('/:id/ownership', authenticateToken, requireRoles(['SUPER_ADMIN', 'VENTURE_ADMIN']), async (req, res) => {
  const { owner_id, deed_reference_number, ownership_percentage } = req.body;
  const flatId = req.params.id;

  await query.run("DELETE FROM flat_ownerships WHERE flat_id = ?", [flatId]);
  const foId = `fo-${crypto.randomUUID().slice(0, 8)}`;
  await query.run(`
    INSERT INTO flat_ownerships (id, flat_id, owner_id, ownership_percentage, deed_reference_number, is_primary_owner)
    VALUES (?, ?, ?, ?, ?, 1)
  `, [foId, flatId, owner_id, ownership_percentage || 100.0, deed_reference_number]);

  await query.run("UPDATE flats SET occupancy_status = 'OWNER_OCCUPIED' WHERE id = ? AND occupancy_status = 'VACANT'", [flatId]);
  res.json({ success: true, message: 'Ownership deed assigned successfully' });
});

export default router;
