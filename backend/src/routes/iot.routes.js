import express from 'express';
import { query } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { realtimeService } from '../realtime/realtime.service.js';

const router = express.Router();

// Get IoT Sensors for Venture
router.get('/sensors', authenticateToken, async (req, res) => {
  const { venture_id } = req.query;
  let sql = `
    SELECT s.*, v.name as venture_name, v.code as venture_code
    FROM iot_sensors s
    JOIN ventures v ON s.venture_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (venture_id) {
    sql += " AND s.venture_id = ?";
    params.push(venture_id);
  }

  sql += " ORDER BY s.sensor_type ASC";

  const sensors = await query.all(sql, params);
  res.json({ success: true, data: sensors });
});

// Trigger Anomaly Spike for Live Testing
router.post('/simulate-spike', authenticateToken, async (req, res) => {
  const { sensor_id, anomaly_type } = req.body;
  const sensor = await query.get("SELECT * FROM iot_sensors WHERE id = ?", [sensor_id]);
  if (!sensor) return res.status(404).json({ success: false, detail: 'Sensor not found' });

  let spikeVal = sensor.max_threshold * 1.35;
  if (sensor.sensor_type === 'WATER_TANK_LEVEL') {
    spikeVal = 12.0; // Critical Low Water
  }

  spikeVal = parseFloat(spikeVal.toFixed(1));

  await query.run("UPDATE iot_sensors SET current_value = ?, status = 'CRITICAL', last_updated = CURRENT_TIMESTAMP WHERE id = ?", [spikeVal, sensor.id]);

  const alertMessage = `🚨 CRITICAL ANOMALY ALERT: ${sensor.sensor_name} reported ${spikeVal}${sensor.unit} (Threshold: ${sensor.min_threshold}-${sensor.max_threshold}${sensor.unit})`;

  realtimeService.broadcast('IOT_CRITICAL_ALERT', {
    sensorId: sensor.id,
    ventureId: sensor.venture_id,
    sensorName: sensor.sensor_name,
    sensorType: sensor.sensor_type,
    currentValue: spikeVal,
    unit: sensor.unit,
    status: 'CRITICAL',
    message: alertMessage
  });

  await realtimeService.logAudit({
    venture_id: sensor.venture_id,
    user_id: req.user.id,
    user_name: req.user.full_name,
    user_role: req.user.activeRole,
    action: 'IOT_ANOMALY_TRIGGERED',
    resource_type: 'IOT_SENSOR',
    resource_id: sensor.id,
    details: alertMessage
  });

  res.json({
    success: true,
    message: 'Anomaly spike simulated successfully',
    data: { ...sensor, current_value: spikeVal, status: 'CRITICAL' }
  });
});

// Reset Sensor
router.post('/reset-sensor', authenticateToken, async (req, res) => {
  const { sensor_id } = req.body;
  const sensor = await query.get("SELECT * FROM iot_sensors WHERE id = ?", [sensor_id]);
  if (!sensor) return res.status(404).json({ success: false, detail: 'Sensor not found' });

  const normalVal = parseFloat(((sensor.min_threshold + sensor.max_threshold) / 2).toFixed(1));
  await query.run("UPDATE iot_sensors SET current_value = ?, status = 'NORMAL', last_updated = CURRENT_TIMESTAMP WHERE id = ?", [normalVal, sensor.id]);

  realtimeService.broadcast('IOT_TELEMETRY_UPDATE', {
    sensorId: sensor.id,
    ventureId: sensor.venture_id,
    sensorName: sensor.sensor_name,
    sensorType: sensor.sensor_type,
    currentValue: normalVal,
    unit: sensor.unit,
    status: 'NORMAL'
  });

  res.json({ success: true, message: 'Sensor reset to normal status', data: { ...sensor, current_value: normalVal, status: 'NORMAL' } });
});

export default router;
