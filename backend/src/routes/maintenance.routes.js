import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/invoices', authenticateToken, async (req, res) => {
  const { venture_id, flat_id, status } = req.query;
  let sql = `
    SELECT mi.*, 
           f.flat_number, f.flat_type, f.built_up_area_sqft,
           fl.floor_name, b.name as block_name, v.name as venture_name, v.id as venture_id,
           o.full_name as owner_name, o.phone as owner_phone
    FROM maintenance_invoices mi
    JOIN flats f ON mi.flat_id = f.id
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    LEFT JOIN flat_ownerships fo ON f.id = fo.flat_id
    LEFT JOIN owners o ON fo.owner_id = o.id
    WHERE 1=1
  `;
  const params = [];
  if (venture_id) { sql += " AND v.id = ?"; params.push(venture_id); }
  if (flat_id) { sql += " AND mi.flat_id = ?"; params.push(flat_id); }
  if (status) { sql += " AND mi.status = ?"; params.push(status); }

  sql += " ORDER BY mi.due_date DESC, mi.billing_month DESC";
  const invoices = await query.all(sql, params);
  res.json({ success: true, data: invoices });
});

router.post('/generate', authenticateToken, requireRoles(['SUPER_ADMIN', 'VENTURE_ADMIN']), async (req, res) => {
  const { venture_id, billing_month, due_date } = req.body;
  const v = await query.get("SELECT maintenance_rate, code FROM ventures WHERE id = ?", [venture_id]);
  if (!v) return res.status(404).json({ success: false, detail: 'Venture not found' });

  const flats = await query.all(`
    SELECT f.id, f.flat_number, f.built_up_area_sqft
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    WHERE b.venture_id = ?
  `, [venture_id]);

  let count = 0;
  for (const flat of flats) {
    const invId = `inv-${crypto.randomUUID().slice(0, 8)}`;
    const invNumber = `INV-${v.code}-${flat.flat_number}-${billing_month.replace('-', '')}`;
    const amount = Number((flat.built_up_area_sqft * v.maintenance_rate).toFixed(2));

    try {
      await query.run(`
        INSERT INTO maintenance_invoices (
          id, flat_id, invoice_number, billing_month, base_amount, total_amount, status, due_date
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `, [invId, flat.id, invNumber, billing_month, amount, amount, due_date]);
      count++;
    } catch (e) {}
  }

  res.json({ success: true, message: `Generated ${count} maintenance invoices for ${billing_month}` });
});

router.post('/invoices/:id/pay', authenticateToken, async (req, res) => {
  const { payment_method } = req.body;
  const paidDate = new Date().toISOString().split('T')[0];

  await query.run(`
    UPDATE maintenance_invoices 
    SET status = 'PAID', paid_date = ?, payment_method = ?
    WHERE id = ?
  `, [paidDate, payment_method || 'UPI', req.params.id]);

  res.json({ success: true, message: 'Invoice marked as PAID successfully', paidDate });
});

export default router;
