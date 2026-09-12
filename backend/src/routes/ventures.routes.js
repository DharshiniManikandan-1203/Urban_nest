import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('', authenticateToken, async (req, res) => {
  const userRoles = req.user.assignments.map(a => a.role_name);
  const { activeRole, activeVentureId } = req.user;

  const allVentures = await query.all(`
    SELECT 
      v.*,
      (SELECT COUNT(*) FROM blocks WHERE venture_id = v.id) as total_blocks,
      (SELECT COUNT(*) FROM flats f 
          JOIN floors fl ON f.floor_id = fl.id 
          JOIN blocks b ON fl.block_id = b.id 
          WHERE b.venture_id = v.id) as total_flats,
      (SELECT COUNT(*) FROM flats f 
          JOIN floors fl ON f.floor_id = fl.id 
          JOIN blocks b ON fl.block_id = b.id 
          WHERE b.venture_id = v.id AND f.occupancy_status != 'VACANT') as occupied_flats,
      (SELECT COUNT(*) FROM venture_amenities WHERE venture_id = v.id AND is_active = 1) as total_amenities
    FROM ventures v
    ORDER BY v.name ASC
  `);

  if (userRoles.includes('SUPER_ADMIN') && (!activeRole || activeRole === 'SUPER_ADMIN')) {
    return res.json({ success: true, data: allVentures });
  }

  if (activeVentureId) {
    const filtered = allVentures.filter(v => v.id === activeVentureId);
    return res.json({ success: true, data: filtered });
  }

  res.json({ success: true, data: allVentures });
});

router.get('/:id', authenticateToken, async (req, res) => {
  const v = await query.get("SELECT * FROM ventures WHERE id = ?", [req.params.id]);
  if (!v) return res.status(404).json({ success: false, detail: 'Venture not found' });
  res.json({ success: true, data: v });
});

router.get('/:id/hierarchy', authenticateToken, async (req, res) => {
  const venture = await query.get("SELECT * FROM ventures WHERE id = ?", [req.params.id]);
  if (!venture) return res.status(404).json({ success: false, detail: 'Venture not found' });

  const blocks = await query.all("SELECT * FROM blocks WHERE venture_id = ? ORDER BY code ASC", [venture.id]);

  for (const block of blocks) {
    const floors = await query.all("SELECT * FROM floors WHERE block_id = ? ORDER BY floor_number ASC", [block.id]);
    for (const floor of floors) {
      const flats = await query.all(`
        SELECT f.*, 
               o.id as owner_id, o.full_name as owner_name, o.email as owner_email, o.phone as owner_phone,
               fo.ownership_percentage, fo.is_primary_owner, fo.deed_reference_number
        FROM flats f
        LEFT JOIN flat_ownerships fo ON f.id = fo.flat_id
        LEFT JOIN owners o ON fo.owner_id = o.id
        WHERE f.floor_id = ?
        ORDER BY f.flat_number ASC
      `, [floor.id]);
      floor.flats = flats;
    }
    block.floors = floors;
  }
  venture.blocks = blocks;

  const amenities = await query.all(`
    SELECT va.*, ac.name as catalog_name, ac.category, ac.icon_name, ac.description
    FROM venture_amenities va
    JOIN amenity_catalog ac ON va.amenity_catalog_id = ac.id
    WHERE va.venture_id = ?
    ORDER BY ac.name ASC
  `, [venture.id]);
  venture.amenities = amenities;

  res.json({ success: true, data: venture });
});

router.post('', authenticateToken, requireRoles(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { name, code, address, city, state, pincode, maintenance_rate, initial_blocks } = req.body;
    
    if (!name || !code || !address || !city || !state || !pincode) {
      return res.status(400).json({ 
        success: false, 
        detail: 'Name, code, address, city, state, and pincode are required' 
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const exists = await query.get("SELECT id FROM ventures WHERE UPPER(code) = ?", [cleanCode]);
    if (exists) {
      return res.status(400).json({ success: false, detail: `Venture code '${cleanCode}' already exists` });
    }

    const vId = `ven-${crypto.randomUUID().slice(0, 8)}`;
    await query.run(`
      INSERT INTO ventures (id, org_id, name, code, address, city, state, pincode, maintenance_rate)
      VALUES (?, 'org-urbannest-01', ?, ?, ?, ?, ?, ?, ?)
    `, [
      vId, 
      name.trim(), 
      cleanCode, 
      address.trim(), 
      city.trim(), 
      state.trim(), 
      pincode.trim(), 
      parseFloat(maintenance_rate) || 3.50
    ]);

    // Optional scaffold initial blocks if specified
    if (initial_blocks && Array.isArray(initial_blocks) && initial_blocks.length > 0) {
      for (const b of initial_blocks) {
        const bId = `blk-${crypto.randomUUID().slice(0, 8)}`;
        const totalFloors = b.total_floors || 2;
        await query.run(`
          INSERT INTO blocks (id, venture_id, name, code, total_floors, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [bId, vId, b.name || 'Block A', b.code || 'BLK-A', totalFloors, b.description || 'Residential Block']);

        for (let flNum = 1; flNum <= totalFloors; flNum++) {
          const flId = `fl-${bId}-${flNum}`;
          await query.run(`
            INSERT INTO floors (id, block_id, floor_number, floor_name, total_flats)
            VALUES (?, ?, ?, ?, 4)
          `, [flId, bId, flNum, `Floor ${flNum}`]);

          for (let unit = 1; unit <= 4; unit++) {
            const flatId = `flat-${vId.slice(4)}-${b.code || 'A'}-${flNum}0${unit}`;
            const flatNum = `${flNum}0${unit}`;
            const fType = unit <= 2 ? '3BHK' : '2BHK';
            const sqft = fType === '3BHK' ? 1650.0 : 1250.0;
            const carpet = sqft * 0.78;
            await query.run(`
              INSERT INTO flats (id, floor_id, flat_number, flat_type, built_up_area_sqft, carpet_area_sqft, occupancy_status, parking_slot_numbers)
              VALUES (?, ?, ?, ?, ?, ?, 'VACANT', ?)
            `, [flatId, flId, flatNum, fType, sqft, carpet, `P-${flNum}0${unit}`]);
          }
        }
      }
    }

    const createdVenture = await query.get("SELECT * FROM ventures WHERE id = ?", [vId]);
    res.status(201).json({ 
      success: true, 
      message: 'Venture created successfully', 
      ventureId: vId,
      data: createdVenture 
    });
  } catch (error) {
    console.error('Error creating venture:', error);
    res.status(500).json({ success: false, detail: 'Failed to create venture: ' + error.message });
  }
});

export default router;
