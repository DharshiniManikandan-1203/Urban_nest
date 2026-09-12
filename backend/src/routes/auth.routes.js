import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { createAccessToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, full_name, phone, role, venture_id, block_id, floor_id } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({
      success: false,
      detail: 'Email, password, and full name are required'
    });
  }

  try {
    // Check if email already exists
    const existingUser = await query.get("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        detail: 'A user with this email address already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-${crypto.randomUUID().slice(0, 8)}`;

    // Insert user
    await query.run(`
      INSERT INTO users (id, email, password_hash, full_name, phone)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, email.trim().toLowerCase(), passwordHash, full_name.trim(), phone?.trim() || null]);

    // Determine Role
    const requestedRoleName = (role || 'OWNER').toUpperCase();
    let roleRow = await query.get("SELECT id, name, description FROM roles WHERE name = ?", [requestedRoleName]);
    if (!roleRow) {
      roleRow = await query.get("SELECT id, name, description FROM roles WHERE name = 'OWNER'");
    }

    // Role assignment
    const asgnId = `asgn-${crypto.randomUUID().slice(0, 8)}`;
    await query.run(`
      INSERT INTO user_role_assignments (id, user_id, role_id, venture_id, block_id, floor_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [asgnId, userId, roleRow.id, venture_id || null, block_id || null, floor_id || null]);

    // If role is OWNER, create/link owner record
    if (roleRow.name === 'OWNER') {
      const existingOwner = await query.get("SELECT id FROM owners WHERE LOWER(email) = LOWER(?)", [email.trim()]);
      if (!existingOwner) {
        const ownerId = `own-${crypto.randomUUID().slice(0, 8)}`;
        await query.run(`
          INSERT INTO owners (id, user_id, full_name, email, phone)
          VALUES (?, ?, ?, ?, ?)
        `, [ownerId, userId, full_name.trim(), email.trim().toLowerCase(), phone?.trim() || '']);
      } else {
        await query.run("UPDATE owners SET user_id = ? WHERE id = ?", [userId, existingOwner.id]);
      }
    }

    // Fetch assignments for token and response
    const assignments = await query.all(`
      SELECT ura.id as assignment_id, r.name as role_name, r.description as role_desc,
             ura.venture_id, v.name as venture_name, v.code as venture_code,
             ura.block_id, b.name as block_name,
             ura.floor_id, fl.floor_name
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      LEFT JOIN ventures v ON ura.venture_id = v.id
      LEFT JOIN blocks b ON ura.block_id = b.id
      LEFT JOIN floors fl ON ura.floor_id = fl.id
      WHERE ura.user_id = ?
    `, [userId]);

    const defaultAssignment = assignments[0] || {
      role_name: roleRow.name,
      venture_id: venture_id || null,
      block_id: block_id || null,
      floor_id: floor_id || null
    };

    const userTokenData = {
      id: userId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      activeRole: defaultAssignment.role_name,
      activeVentureId: defaultAssignment.venture_id,
      activeBlockId: defaultAssignment.block_id,
      activeFloorId: defaultAssignment.floor_id
    };

    const token = createAccessToken(userTokenData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        activeRole: defaultAssignment.role_name,
        activeVentureId: defaultAssignment.venture_id,
        activeVentureName: defaultAssignment.venture_name || 'Global Organization',
        activeBlockId: defaultAssignment.block_id,
        activeFloorId: defaultAssignment.floor_id,
        availableRoles: assignments
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, detail: 'Failed to register user: ' + error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, detail: 'Email and password required' });
  }

  const user = await query.get("SELECT * FROM users WHERE email = ?", [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ success: false, detail: 'Invalid email or password' });
  }

  delete user.password_hash;

  const assignments = await query.all(`
    SELECT ura.id as assignment_id, r.name as role_name, r.description as role_desc,
           ura.venture_id, v.name as venture_name, v.code as venture_code,
           ura.block_id, b.name as block_name,
           ura.floor_id, fl.floor_name
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    LEFT JOIN ventures v ON ura.venture_id = v.id
    LEFT JOIN blocks b ON ura.block_id = b.id
    LEFT JOIN floors fl ON ura.floor_id = fl.id
    WHERE ura.user_id = ?
  `, [user.id]);

  const defaultAssignment = assignments[0] || { role_name: 'OWNER', venture_id: null, block_id: null, floor_id: null };

  const userTokenData = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    activeRole: defaultAssignment.role_name,
    activeVentureId: defaultAssignment.venture_id,
    activeBlockId: defaultAssignment.block_id,
    activeFloorId: defaultAssignment.floor_id
  };

  const token = createAccessToken(userTokenData);

  res.json({
    success: true,
    token,
    user: {
      ...user,
      activeRole: defaultAssignment.role_name,
      activeVentureId: defaultAssignment.venture_id,
      activeVentureName: defaultAssignment.venture_name || 'Global Organization',
      activeBlockId: defaultAssignment.block_id,
      activeFloorId: defaultAssignment.floor_id,
      availableRoles: assignments
    }
  });
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/switch-context', authenticateToken, (req, res) => {
  const { role, ventureId, blockId, floorId } = req.body;
  const userRoles = req.user.assignments.map(a => a.role_name);

  if (!userRoles.includes('SUPER_ADMIN') && !userRoles.includes(role)) {
    return res.status(403).json({ success: false, detail: 'You do not hold this role' });
  }

  const userTokenData = {
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.full_name,
    activeRole: role,
    activeVentureId: ventureId || null,
    activeBlockId: blockId || null,
    activeFloorId: floorId || null
  };

  const newToken = createAccessToken(userTokenData);
  res.json({
    success: true,
    token: newToken,
    activeRole: role,
    activeVentureId: ventureId,
    activeBlockId: blockId,
    activeFloorId: floorId
  });
});

router.get('/demo-users', async (req, res) => {
  const users = await query.all(`
    SELECT u.id, u.email, u.full_name, u.phone,
           GROUP_CONCAT(r.name) as roles,
           GROUP_CONCAT(COALESCE(v.name, 'All Ventures')) as ventures
    FROM users u
    LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
    LEFT JOIN roles r ON ura.role_id = r.id
    LEFT JOIN ventures v ON ura.venture_id = v.id
    GROUP BY u.id
  `);
  res.json({ success: true, demoUsers: users });
});

export default router;
