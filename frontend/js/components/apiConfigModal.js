import { CONFIG } from '../config.js';
import { Modal } from './modal.js';
import { showToast } from './toast.js';
import { realtime } from '../realtime.js';
import { state } from '../state.js';
import { api } from '../api.js';

export function openApiConfigModal() {
  const currentUrl = CONFIG.API_BASE_URL;
  const savedUrl = CONFIG.getSavedApiBaseUrl();

  const bodyHtml = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 12px 16px; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--text-secondary);">
        <i class="fa-solid fa-server text-indigo-400"></i> Configure the backend API endpoint for Urban Nest. When deployed on Vercel, point this to your Render service URL (e.g. <code>https://urban-nest-backend.onrender.com/api/v1</code>).
      </div>

      <div class="form-group">
        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Backend API Base URL</span>
          <span id="backend-ping-status" style="font-size: 0.75rem; color: var(--text-muted);">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Checking connection...
          </span>
        </label>
        <input 
          type="text" 
          id="custom-api-url" 
          class="form-control" 
          value="${savedUrl || currentUrl}" 
          placeholder="https://your-backend-service.onrender.com/api/v1"
          style="font-family: monospace; font-size: 0.85rem;"
        />
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
          Currently active endpoint: <code style="color: #818cf8;">${currentUrl}</code>
        </div>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-localhost">
          <i class="fa-solid fa-laptop-code"></i> Localhost (Port 8000)
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-relative">
          <i class="fa-solid fa-link"></i> Relative (/api/v1)
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-test-ping">
          <i class="fa-solid fa-heart-pulse"></i> Test Ping Endpoint
        </button>
      </div>

      <div id="ping-result-box" style="display: none; padding: 10px 14px; border-radius: 6px; font-size: 0.8rem; font-family: monospace;"></div>

      <div class="modal-footer" style="padding: 12px 0 0; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); margin-top: 8px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-default-api">
          <i class="fa-solid fa-rotate-left"></i> Reset to Default
        </button>
        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn btn-secondary" data-modal-close>Close</button>
          <button type="button" class="btn btn-primary" id="btn-save-api-url">
            <i class="fa-solid fa-floppy-disk"></i> Save & Connect
          </button>
        </div>
      </div>
    </div>
  `;

  Modal.show({
    title: '🌐 Backend Server & Render Endpoint Config',
    bodyHtml,
    size: 'md'
  });

  const input = document.getElementById('custom-api-url');
  const pingStatus = document.getElementById('backend-ping-status');
  const pingResultBox = document.getElementById('ping-result-box');

  const testPing = async (targetUrl) => {
    if (!targetUrl) return;
    const cleanUrl = targetUrl.trim().replace(/\/+$/, '');
    if (pingStatus) {
      pingStatus.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-indigo-400"></i> Testing ${cleanUrl}...`;
    }
    if (pingResultBox) {
      pingResultBox.style.display = 'block';
      pingResultBox.style.background = 'rgba(255,255,255,0.05)';
      pingResultBox.style.color = '#94a3b8';
      pingResultBox.innerHTML = `Pinging ${cleanUrl}/health ...`;
    }

    try {
      const startTime = performance.now();
      const res = await fetch(`${cleanUrl}/health`, { method: 'GET', mode: 'cors' });
      const elapsed = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        if (pingStatus) {
          pingStatus.innerHTML = `<span style="color: #34d399;"><i class="fa-solid fa-circle-check"></i> Connected (${elapsed}ms)</span>`;
        }
        if (pingResultBox) {
          pingResultBox.style.background = 'rgba(16, 185, 129, 0.1)';
          pingResultBox.style.color = '#34d399';
          pingResultBox.style.border = '1px solid rgba(16, 185, 129, 0.3)';
          pingResultBox.innerHTML = `✓ Backend Active (${elapsed}ms)<br/>Status: ${data.status || 'OK'} | Uptime: ${Math.round(data.uptime || 0)}s`;
        }
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      if (pingStatus) {
        pingStatus.innerHTML = `<span style="color: #f87171;"><i class="fa-solid fa-triangle-exclamation"></i> Unreachable</span>`;
      }
      if (pingResultBox) {
        pingResultBox.style.background = 'rgba(239, 68, 68, 0.1)';
        pingResultBox.style.color = '#f87171';
        pingResultBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        pingResultBox.innerHTML = `✗ Connection failed: ${err.message}<br/>Make sure Render service is awake and CORS is active.`;
      }
    }
  };

  // Initial test
  testPing(input.value || currentUrl);

  // Button triggers
  document.getElementById('btn-quick-localhost')?.addEventListener('click', () => {
    input.value = 'http://localhost:8000/api/v1';
    testPing(input.value);
  });

  document.getElementById('btn-quick-relative')?.addEventListener('click', () => {
    input.value = '/api/v1';
    testPing(input.value);
  });

  document.getElementById('btn-test-ping')?.addEventListener('click', () => {
    testPing(input.value);
  });

  document.getElementById('btn-reset-default-api')?.addEventListener('click', () => {
    CONFIG.setApiBaseUrl('');
    showToast('Reset API Base URL to default.', 'info');
    Modal.hide();
    window.location.reload();
  });

  document.getElementById('btn-save-api-url')?.addEventListener('click', async () => {
    const newUrl = input.value.trim();
    CONFIG.setApiBaseUrl(newUrl);
    showToast(`Connected to API backend: ${CONFIG.API_BASE_URL}`, 'success');
    Modal.hide();

    // Re-initialize realtime & refresh state
    realtime.connect();
    try {
      const venturesRes = await api.getVentures();
      state.setState({ ventures: venturesRes.data });
    } catch (e) {
      console.warn('Refresh note:', e.message);
    }
  });
}
