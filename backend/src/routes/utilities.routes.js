import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { realtimeService } from '../realtime/realtime.service.js';

const router = express.Router();

// Get Smart Meters
router.get('/meters', authenticateToken, async (req, res) => {
  const { flat_id, venture_id } = req.query;

  let sql = `
    SELECT sm.*, f.flat_number, f.built_up_area_sqft, fl.floor_name, b.name as block_name, v.name as venture_name
    FROM smart_meters sm
    JOIN flats f ON sm.flat_id = f.id
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (flat_id) {
    sql += " AND sm.flat_id = ?";
    params.push(flat_id);
  }
  if (venture_id) {
    sql += " AND b.venture_id = ?";
    params.push(venture_id);
  }

  sql += " ORDER BY f.flat_number ASC, sm.meter_type ASC";

  const meters = await query.all(sql, params);
  res.json({ success: true, data: meters });
});

// Telemetry Pulse (simulate manual meter consumption tick)
router.post('/pulse', authenticateToken, async (req, res) => {
  const { meter_id, units_added } = req.body;
  const meter = await query.get("SELECT * FROM smart_meters WHERE id = ?", [meter_id]);
  if (!meter) return res.status(404).json({ success: false, detail: 'Meter not found' });

  const added = parseFloat(units_added) || 1.0;
  const newReading = parseFloat((meter.current_reading + added).toFixed(2));

  await query.run("UPDATE smart_meters SET current_reading = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?", [newReading, meter.id]);

  realtimeService.broadcast('SMART_METER_TICK', {
    meterId: meter.id,
    flatId: meter.flat_id,
    meterType: meter.meter_type,
    currentReading: newReading,
    unitType: meter.unit_type,
    increment: added,
    manualPulse: true
  });

  res.json({ success: true, message: 'Meter pulse recorded', data: { ...meter, current_reading: newReading } });
});

// Consumption Breakdown for a Flat
router.get('/breakdown/:flatId', authenticateToken, async (req, res) => {
  const { flatId } = req.params;
  const flat = await query.get(`
    SELECT f.*, fl.floor_name, b.name as block_name, v.name as venture_name, v.maintenance_rate, v.id as venture_id
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    WHERE f.id = ?
  `, [flatId]);

  if (!flat) return res.status(404).json({ success: false, detail: 'Flat not found' });

  const meters = await query.all("SELECT * FROM smart_meters WHERE flat_id = ?", [flatId]);

  let utilityTotal = 0;
  const meterDetails = meters.map(m => {
    const monthlyUnits = m.meter_type === 'ELECTRICITY' ? (m.current_reading % 150) + 40
      : (m.meter_type === 'WATER' ? (m.current_reading % 3000) + 1200
      : (m.current_reading % 20) + 5);
    
    const cost = parseFloat((monthlyUnits * m.rate_per_unit).toFixed(2));
    utilityTotal += cost;

    return {
      id: m.id,
      type: m.meter_type,
      serial: m.meter_serial,
      reading: m.current_reading,
      units: parseFloat(monthlyUnits.toFixed(1)),
      unitType: m.unit_type,
      rate: m.rate_per_unit,
      cost
    };
  });

  const baseMaintenance = parseFloat((flat.built_up_area_sqft * flat.maintenance_rate).toFixed(2));
  const grandTotal = parseFloat((baseMaintenance + utilityTotal).toFixed(2));

  res.json({
    success: true,
    data: {
      flat,
      baseMaintenance,
      utilityTotal: parseFloat(utilityTotal.toFixed(2)),
      grandTotal,
      meters: meterDetails
    }
  });
});

// Generate Integrated Maintenance + Utilities Invoice
router.post('/generate-integrated-invoice', authenticateToken, requireRoles(['SUPER_ADMIN', 'VENTURE_ADMIN']), async (req, res) => {
  const { flat_id, billing_month } = req.body;
  const flat = await query.get(`
    SELECT f.*, v.maintenance_rate, v.id as venture_id, v.name as venture_name
    FROM flats f
    JOIN floors fl ON f.floor_id = fl.id
    JOIN blocks b ON fl.block_id = b.id
    JOIN ventures v ON b.venture_id = v.id
    WHERE f.id = ?
  `, [flat_id]);

  if (!flat) return res.status(404).json({ success: false, detail: 'Flat not found' });

  const month = billing_month || new Date().toISOString().slice(0, 7);
  const baseAmount = flat.built_up_area_sqft * flat.maintenance_rate;
  const utilitySurcharge = 1250.0; // Simulated metered utility addition
  const totalAmount = baseAmount + utilitySurcharge;
  const invoiceId = `inv-util-${crypto.randomUUID().slice(0, 8)}`;
  const invoiceNum = `INV-INT-${flat.flat_number}-${month.replace('-', '')}`;
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    await query.run(`
      INSERT INTO maintenance_invoices (id, flat_id, invoice_number, billing_month, base_amount, amenity_charges, total_amount, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `, [invoiceId, flat_id, invoiceNum, month, baseAmount, utilitySurcharge, totalAmount, dueDate]);

    realtimeService.broadcast('INTEGRATED_INVOICE_GENERATED', {
      invoiceId,
      invoiceNumber: invoiceNum,
      flatNumber: flat.flat_number,
      totalAmount,
      billingMonth: month,
      message: `🧾 Integrated Bill generated for Flat ${flat.flat_number}: ₹${totalAmount.toLocaleString()}`
    });

    await realtimeService.logAudit({
      venture_id: flat.venture_id,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_role: req.user.activeRole,
      action: 'INTEGRATED_INVOICE_GENERATED',
      resource_type: 'MAINTENANCE_INVOICE',
      resource_id: invoiceId,
      details: `Generated integrated bill (${invoiceNum}) for Unit ${flat.flat_number} totaling ₹${totalAmount}`
    });

    res.status(201).json({ success: true, message: 'Integrated invoice generated', invoiceId });
  } catch (err) {
    res.status(400).json({ success: false, detail: err.message });
  }
});

export default router;
