import { CONFIG } from './config.js';
import { showToast } from './components/toast.js';

class RealtimeClient {
  constructor() {
    this.eventSource = null;
    this.subscribers = new Map();
    this.notifications = [];
    this.unreadCount = 0;
    this.isConnected = false;
    this.audioCtx = null;
  }

  init() {
    this.connect();
  }

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const streamUrl = `${CONFIG.API_BASE_URL}/realtime/stream`;
    try {
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.updateConnectionStatus(true);
        console.log('⚡ Connected to Urban Nest Real-Time Stream');
      };

      this.eventSource.onerror = (err) => {
        this.isConnected = false;
        this.updateConnectionStatus(false);
        console.warn('Real-time connection interrupted. Auto-reconnecting...');
      };

      // General message handler
      const eventTypes = [
        'CONNECTED',
        'GATE_ENTRY_RECORDED',
        'GATE_EXIT_RECORDED',
        'VISITOR_PRE_APPROVED',
        'IOT_TELEMETRY_UPDATE',
        'IOT_CRITICAL_ALERT',
        'SMART_METER_TICK',
        'TICKET_CREATED',
        'TICKET_ESCALATED',
        'TICKET_AUTO_ESCALATED',
        'TICKET_STATUS_UPDATED',
        'INTEGRATED_INVOICE_GENERATED',
        'AUDIT_LOG_ENTRY'
      ];

      eventTypes.forEach(type => {
        this.eventSource.addEventListener(type, (e) => {
          try {
            const data = JSON.parse(e.data);
            this.handleEvent(type, data);
          } catch (err) {
            console.error('Error parsing real-time event:', err);
          }
        });
      });

    } catch (err) {
      console.error('Failed to init EventSource:', err);
    }
  }

  handleEvent(type, data) {
    const payload = data.payload || data;

    // 1. Notify listeners
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).forEach(cb => cb(payload));
    }
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(cb => cb({ type, payload }));
    }

    // 2. Add to notification tray if significant
    const alertTypes = [
      'GATE_ENTRY_RECORDED',
      'GATE_EXIT_RECORDED',
      'VISITOR_PRE_APPROVED',
      'IOT_CRITICAL_ALERT',
      'TICKET_ESCALATED',
      'TICKET_AUTO_ESCALATED',
      'INTEGRATED_INVOICE_GENERATED'
    ];

    if (alertTypes.includes(type)) {
      this.notifications.unshift({
        id: data.id || Math.random().toString(),
        type,
        timestamp: data.timestamp || new Date().toISOString(),
        message: payload.message || `${type.replace(/_/g, ' ')} received`,
        payload
      });
      this.unreadCount++;
      this.playChime(type === 'IOT_CRITICAL_ALERT' || type === 'TICKET_AUTO_ESCALATED' ? 'alarm' : 'chime');
      this.updateTrayBadge();

      // Show toast
      if (type === 'IOT_CRITICAL_ALERT') {
        showToast(payload.message || 'Critical IoT Anomaly Detected!', 'error');
      } else if (type === 'TICKET_AUTO_ESCALATED' || type === 'TICKET_ESCALATED') {
        showToast(payload.message || 'Ticket Escalated!', 'warning');
      } else if (type === 'GATE_ENTRY_RECORDED') {
        showToast(payload.message || 'Gate Entry Verified', 'info');
      }
    }
  }

  on(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(callback);
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).delete(callback);
    }
  }

  playChime(type = 'chime') {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'alarm') {
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  updateConnectionStatus(connected) {
    const statusPill = document.getElementById('realtime-status-pill');
    if (statusPill) {
      statusPill.className = `live-status-pill ${connected ? 'status-live' : 'status-offline'}`;
      statusPill.innerHTML = connected 
        ? `<span class="live-pulse-dot"></span> LIVE TELEMETRY`
        : `<i class="fa-solid fa-circle-nodes"></i> RECONNECTING`;
    }
  }

  updateTrayBadge() {
    const badge = document.getElementById('notif-badge-count');
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
  }

  clearUnread() {
    this.unreadCount = 0;
    this.updateTrayBadge();
  }
}

export const realtime = new RealtimeClient();
