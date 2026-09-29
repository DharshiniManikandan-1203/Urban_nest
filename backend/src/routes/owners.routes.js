import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('', authenticateToken, async (req, res) => {
  const owners = await query.all(`
    SELECT o.*, 
           COUNT(fo.flat_id) as total_properties,
           GROUP_CONCAT(DISTINCT v.name) as venture_names
    FROM owners o
    LEFT JOIN flat_ownerships fo ON o.id = fo.owner_id
    LEFT JOIN flats f ON fo.flat_id = f.id
    LEFT JOIN floors fl ON f.floor_id = fl.id
    LEFT JOIN blocks b ON fl.block_id = b.id
    LEFT JOIN ventures v ON b.venture_id = v.id
    GROUP BY o.id
    ORDER BY o.full_name ASC
  `);
  res.json({ success: true, data: owners });
});

router.get('/:id', authenticateToken, async (req, res) => {
  const owner = await query.get("SELECT * FROM owners WHERE id = ?", [req.params.id]);
  if (!owner) return res.status(404).json({ success: false, detail: 'Owner not found' });

  owner.ownedFlats = await query.all(`
    SELECT f.*, fo.ownership_percentage, fo.deed_reference_number, fo.is_primary_owner,
           fl.floor_number, fl.floor_name,
           b.name as block_name, b.code as block_code,
           v.id as venture_id, v.name as venture_name, v.code as venture_code, v.address as venture_address
    FROM flat_ownerships fo
    JOIN flats f ON fo.flat_id = f.id
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    WHERE fo.owner_id = ?
  `, [owner.id]);

  res.json({ success: true, data: owner });
});

router.post('', authenticateToken, requireRoles(['SUPER_ADMIN', 'VENTURE_ADMIN']), async (req, res) => {
  const { full_name, email, phone, national_id_type, national_id_number, emergency_contact } = req.body;
  const oId = `own-${crypto.randomUUID().slice(0, 8)}`;
  try {
    await query.run(`
      INSERT INTO owners (id, full_name, email, phone, national_id_type, national_id_number, emergency_contact)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [oId, full_name, email, phone, national_id_type || 'AADHAAR', national_id_number, emergency_contact]);
    res.json({ success: true, message: 'Owner registered successfully', ownerId: oId });
  } catch (err) {
    res.status(400).json({ success: false, detail: err.message });
  }
});

export default router;
