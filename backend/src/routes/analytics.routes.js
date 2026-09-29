import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', authenticateToken, async (req, res) => {
  const totalVenturesRow = await query.get("SELECT COUNT(*) as c FROM ventures");
  const totalBlocksRow = await query.get("SELECT COUNT(*) as c FROM blocks");
  const totalFlatsRow = await query.get("SELECT COUNT(*) as c FROM flats");
  const ownerOccRow = await query.get("SELECT COUNT(*) as c FROM flats WHERE occupancy_status = 'OWNER_OCCUPIED'");
  const tenantOccRow = await query.get("SELECT COUNT(*) as c FROM flats WHERE occupancy_status = 'TENANT_OCCUPIED'");
  const vacantRow = await query.get("SELECT COUNT(*) as c FROM flats WHERE occupancy_status = 'VACANT'");
  const totalOwnersRow = await query.get("SELECT COUNT(*) as c FROM owners");
  const totalAmenitiesRow = await query.get("SELECT COUNT(*) as c FROM venture_amenities WHERE is_active = 1");
  const totalBookingsRow = await query.get("SELECT COUNT(*) as c FROM amenity_bookings");
  const collectedRow = await query.get("SELECT SUM(total_amount) as s FROM maintenance_invoices WHERE status = 'PAID'");
  const pendingRow = await query.get("SELECT SUM(total_amount) as s FROM maintenance_invoices WHERE status = 'PENDING'");
  const openTktsRow = await query.get("SELECT COUNT(*) as c FROM helpdesk_tickets WHERE status = 'OPEN'");
  const inProgTktsRow = await query.get("SELECT COUNT(*) as c FROM helpdesk_tickets WHERE status = 'IN_PROGRESS'");

  const ventureBreakdown = await query.all(`
    SELECT 
      v.id, v.name, v.code, v.city, v.status, v.maintenance_rate,
      (SELECT COUNT(*) FROM blocks WHERE venture_id = v.id) as blocks_count,
      (SELECT COUNT(*) FROM flats f JOIN floors fl ON f.floor_id = fl.id JOIN blocks b ON fl.block_id = b.id WHERE b.venture_id = v.id) as flats_count,
      (SELECT COUNT(*) FROM venture_amenities WHERE venture_id = v.id AND is_active = 1) as amenities_count
    FROM ventures v
  `);

  const totalFlats = totalFlatsRow.c || 0;
  const ownerOccupied = ownerOccRow.c || 0;
  const tenantOccupied = tenantOccRow.c || 0;
  const vacant = vacantRow.c || 0;
  const collected = collectedRow.s || 0.0;
  const pending = pendingRow.s || 0.0;

  res.json({
    success: true,
    data: {
      totalVentures: totalVenturesRow.c || 0,
      totalBlocks: totalBlocksRow.c || 0,
      totalFlats,
      occupancy: {
        ownerOccupied,
        tenantOccupied,
        vacant,
        occupancyRate: totalFlats > 0 ? Number((((ownerOccupied + tenantOccupied) / totalFlats) * 100).toFixed(1)) : 0
      },
      totalOwners: totalOwnersRow.c || 0,
      totalAmenitiesEnabled: totalAmenitiesRow.c || 0,
      totalBookings: totalBookingsRow.c || 0,
      financials: {
        collected,
        pending,
        totalBilled: collected + pending
      },
      tickets: {
        open: openTktsRow.c || 0,
        inProgress: inProgTktsRow.c || 0
      },
      ventureBreakdown
    }
  });
});

export default router;
