import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('', authenticateToken, async (req, res) => {
  const { venture_id } = req.query;
  let sql = `
    SELECT b.*, v.name as venture_name, v.code as venture_code,
           (SELECT COUNT(*) FROM floors WHERE block_id = b.id) as floor_count,
           (SELECT COUNT(*) FROM flats f JOIN floors fl ON f.floor_id = fl.id WHERE fl.block_id = b.id) as flat_count
    FROM blocks b
    JOIN ventures v ON b.venture_id = v.id
  `;
  const params = [];
  if (venture_id) {
    sql += " WHERE b.venture_id = ?";
    params.push(venture_id);
  }
  sql += " ORDER BY b.code ASC";

  const blocks = await query.all(sql, params);
  res.json({ success: true, data: blocks });
});

router.post('', authenticateToken, requireRoles(['SUPER_ADMIN', 'VENTURE_ADMIN']), async (req, res) => {
  const { venture_id, name, code, total_floors, description } = req.body;
  const bId = `blk-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await query.run(`
      INSERT INTO blocks (id, venture_id, name, code, total_floors, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [bId, venture_id, name, code, total_floors || 1, description]);
    res.json({ success: true, message: 'Block created', blockId: bId });
  } catch (err) {
    res.status(400).json({ success: false, detail: err.message });
  }
});

export default router;
