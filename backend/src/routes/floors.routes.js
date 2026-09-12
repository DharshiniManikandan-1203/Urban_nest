import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('', authenticateToken, async (req, res) => {
  const { block_id } = req.query;
  let sql = `
    SELECT fl.*, b.name as block_name, b.code as block_code, v.name as venture_name, v.id as venture_id,
           (SELECT COUNT(*) FROM flats WHERE floor_id = fl.id) as actual_flats_count
    FROM floors fl
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
  `;
  const params = [];
  if (block_id) {
    sql += " WHERE fl.block_id = ?";
    params.push(block_id);
  }
  sql += " ORDER BY fl.floor_number ASC";

  const floors = await query.all(sql, params);
  res.json({ success: true, data: floors });
});

router.post('', authenticateToken, requireRoles(['SUPER_ADMIN', 'VENTURE_ADMIN', 'BLOCK_MANAGER']), async (req, res) => {
  const { block_id, floor_number, floor_name, total_flats } = req.body;
  const flId = `fl-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await query.run(`
      INSERT INTO floors (id, block_id, floor_number, floor_name, total_flats)
      VALUES (?, ?, ?, ?, ?)
    `, [flId, block_id, floor_number, floor_name, total_flats || 4]);
    res.json({ success: true, message: 'Floor created', floorId: flId });
  } catch (err) {
    res.status(400).json({ success: false, detail: err.message });
  }
});

export default router;
