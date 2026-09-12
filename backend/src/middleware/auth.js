import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/config.js';
import { query } from '../database/db.js';

export function createAccessToken(userData) {
  return jwt.sign(
    {
      sub: userData.id,
      email: userData.email,
      fullName: userData.full_name,
      activeRole: userData.activeRole || 'OWNER',
      activeVentureId: userData.activeVentureId || null,
      activeBlockId: userData.activeBlockId || null,
      activeFloorId: userData.activeFloorId || null
    },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRES_IN }
  );
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, detail: 'Authentication token is missing' });
  }

  try {
    const payload = jwt.verify(token, CONFIG.JWT_SECRET);
    const user = await query.get("SELECT id, email, full_name, phone, is_active FROM users WHERE id = ?", [payload.sub]);
    
    if (!user) {
      return res.status(401).json({ success: false, detail: 'User not found' });
    }

    const assignments = await query.all(`
      SELECT ura.id, r.name as role_name, ura.venture_id, ura.block_id, ura.floor_id,
             v.name as venture_name, b.name as block_name, fl.floor_name
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      LEFT JOIN ventures v ON ura.venture_id = v.id
      LEFT JOIN blocks b ON ura.block_id = b.id
      LEFT JOIN floors fl ON ura.floor_id = fl.id
      WHERE ura.user_id = ?
    `, [user.id]);

    user.assignments = assignments;
    user.activeRole = payload.activeRole || (assignments[0] ? assignments[0].role_name : 'OWNER');
    user.activeVentureId = payload.activeVentureId || (assignments[0] ? assignments[0].venture_id : null);
    user.activeBlockId = payload.activeBlockId || (assignments[0] ? assignments[0].block_id : null);
    user.activeFloorId = payload.activeFloorId || (assignments[0] ? assignments[0].floor_id : null);

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, detail: 'Invalid or expired token' });
  }
}

export function requireRoles(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, detail: 'Authentication required' });
    }

    const userRoles = req.user.assignments.map(a => a.role_name);
    if (userRoles.includes('SUPER_ADMIN')) {
      return next(); // God-mode access
    }

    if (!allowedRoles.includes(req.user.activeRole) && !userRoles.some(r => allowedRoles.includes(r))) {
      return res.status(403).json({
        success: false,
        detail: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}
