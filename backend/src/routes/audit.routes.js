import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// List Audit Logs
router.get('/logs', authenticateToken, async (req, res) => {
  const { venture_id, action, limit = 100 } = req.query;
  let sql = `
    SELECT al.*, v.name as venture_name
    FROM audit_logs al
    LEFT JOIN ventures v ON al.venture_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (venture_id) {
    sql += " AND (al.venture_id = ? OR al.venture_id IS NULL)";
    params.push(venture_id);
  }
  if (action) {
    sql += " AND al.action = ?";
    params.push(action);
  }

  sql += ` ORDER BY al.created_at DESC LIMIT ${Math.min(200, parseInt(limit))}`;

  const logs = await query.all(sql, params);
  res.json({ success: true, data: logs });
});

export default router;
