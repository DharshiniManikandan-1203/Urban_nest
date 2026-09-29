import crypto from 'crypto';
import { query } from '../database/db.js';

class RealtimeService {
  constructor() {
    this.clients = new Set();
    this.notificationsHistory = [];
    this.simulatorInterval = null;
  }

  addClient(res, user = null) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`event: CONNECTED\ndata: ${JSON.stringify({ message: 'Connected to Urban Nest Real-Time Event Stream', timestamp: new Date().toISOString() })}\n\n`);

    const clientObj = { res, user, id: crypto.randomUUID() };
    this.clients.add(clientObj);

    res.on('close', () => {
      this.clients.delete(clientObj);
    });

    return clientObj;
  }

  broadcast(eventType, payload = {}) {
    const messageData = {
      id: `evt-${crypto.randomUUID().slice(0, 8)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      payload
    };

    // Keep last 50 notifications in history
    this.notificationsHistory.unshift(messageData);
    if (this.notificationsHistory.length > 50) {
      this.notificationsHistory.pop();
    }

    const sseFormatted = `event: ${eventType}\ndata: ${JSON.stringify(messageData)}\n\n`;

    for (const client of this.clients) {
      try {
        client.res.write(sseFormatted);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  async logAudit({ venture_id, user_id, user_name, user_role, action, resource_type, resource_id, details, ip_address = '127.0.0.1' }) {
    const auditId = `aud-${crypto.randomUUID().slice(0, 8)}`;
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || '');

    try {
      await query.run(`
        INSERT INTO audit_logs (id, venture_id, user_id, user_name, user_role, action, resource_type, resource_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [auditId, venture_id || null, user_id || null, user_name || 'System', user_role || 'SYSTEM', action, resource_type, resource_id || null, detailsStr, ip_address]);

      this.broadcast('AUDIT_LOG_ENTRY', {
        id: auditId,
        venture_id,
        user_name: user_name || 'System',
        user_role: user_role || 'SYSTEM',
        action,
        resource_type,
        resource_id,
        details: detailsStr,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  startSimulator() {
    if (this.simulatorInterval) return;

    let tickCounter = 0;

    this.simulatorInterval = setInterval(async () => {
      tickCounter++;

      try {
        // 1. Live IoT Sensor fluctuations (every 4 seconds)
        const sensors = await query.all("SELECT * FROM iot_sensors");
        if (sensors && sensors.length > 0) {
          // Select 2 random sensors to fluctuate slightly
          const picked = sensors.sort(() => 0.5 - Math.random()).slice(0, 2);
          for (const s of picked) {
            let delta = (Math.random() - 0.5) * 1.5;
            let newVal = Math.max(0, parseFloat((s.current_value + delta).toFixed(1)));
            
            // Keep within sensor threshold bounds generally
            if (s.sensor_type === 'WATER_TANK_LEVEL') {
              newVal = Math.min(99, Math.max(15, newVal));
            } else if (s.sensor_type === 'EV_LOAD_KW') {
              newVal = Math.min(58, Math.max(5, newVal));
            }

            let status = 'NORMAL';
            if (newVal > s.max_threshold || newVal < s.min_threshold) {
              status = 'WARNING';
            }

            await query.run("UPDATE iot_sensors SET current_value = ?, status = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?", [newVal, status, s.id]);

            this.broadcast('IOT_TELEMETRY_UPDATE', {
              sensorId: s.id,
              ventureId: s.venture_id,
              sensorName: s.sensor_name,
              sensorType: s.sensor_type,
              currentValue: newVal,
              unit: s.unit,
              status
            });
          }
        }

        // 2. Smart Sub-Meter small increments (every 8 seconds)
        if (tickCounter % 2 === 0) {
          const meters = await query.all("SELECT * FROM smart_meters ORDER BY RANDOM() LIMIT 2");
          for (const m of meters) {
            let inc = m.meter_type === 'WATER' ? Math.floor(Math.random() * 8) + 2 : parseFloat((Math.random() * 0.15).toFixed(2));
            let newRead = parseFloat((m.current_reading + inc).toFixed(2));
            await query.run("UPDATE smart_meters SET current_reading = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?", [newRead, m.id]);

            this.broadcast('SMART_METER_TICK', {
              meterId: m.id,
              flatId: m.flat_id,
              meterType: m.meter_type,
              currentReading: newRead,
              unitType: m.unit_type,
              increment: inc
            });
          }
        }

        // 3. Ticket SLA Auto-Escalation Check (every 20 seconds)
        if (tickCounter % 5 === 0) {
          const overdueTickets = await query.all(`
            SELECT t.*, v.name as venture_name
            FROM helpdesk_tickets t
            JOIN flats f ON t.flat_id = f.id
            JOIN floors fl ON f.floor_id = fl.id
            JOIN blocks b ON fl.block_id = b.id
            JOIN ventures v ON b.venture_id = v.id
            WHERE t.status != 'RESOLVED' AND t.is_escalated = 0 AND datetime('now') > datetime(t.sla_deadline)
          `);

          for (const ticket of overdueTickets) {
            const newLevel = (ticket.escalation_level || 0) + 1;
            const nextRole = newLevel === 1 ? 'BLOCK_MANAGER' : (newLevel === 2 ? 'VENTURE_ADMIN' : 'SUPER_ADMIN');

            await query.run(`
              UPDATE helpdesk_tickets 
              SET escalation_level = ?, is_escalated = 1, assigned_to_role = ?, updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `, [newLevel, nextRole, ticket.id]);

            await this.logAudit({
              venture_id: ticket.venture_id,
              user_name: 'SLA Escalation Bot',
              user_role: 'SYSTEM',
              action: 'TICKET_AUTO_ESCALATED',
              resource_type: 'HELPDESK_TICKET',
              resource_id: ticket.id,
              details: `Ticket "${ticket.title}" breached SLA deadline and auto-escalated to ${nextRole}`
            });

            this.broadcast('TICKET_AUTO_ESCALATED', {
              ticketId: ticket.id,
              title: ticket.title,
              priority: ticket.priority,
              assignedToRole: nextRole,
              escalationLevel: newLevel,
              message: `⚠️ Ticket #${ticket.id.slice(0, 6)} breached SLA and auto-escalated to ${nextRole}`
            });
          }
        }

      } catch (err) {
        console.error('Simulator tick error:', err);
      }
    }, 4000);
  }
}

export const realtimeService = new RealtimeService();
realtimeService.startSimulator();
