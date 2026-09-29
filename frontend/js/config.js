// API Configuration & Dynamic Host Resolution
function resolveApiBaseUrl() {
  // 1. User/Admin explicit override saved in localStorage
  const savedUrl = localStorage.getItem('urbannest_api_base_url');
  if (savedUrl && savedUrl.trim()) {
    return savedUrl.trim().replace(/\/+$/, '');
  }

  // 2. Global window injection (if provided via script tag)
  if (window.__URBANNEST_API_BASE_URL__) {
    return window.__URBANNEST_API_BASE_URL__.trim().replace(/\/+$/, '');
  }

  // 3. Local development environment
  const isLocalDev = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalDev) {
    return 'http://localhost:8000/api/v1';
  }

  // 4. Default for production (e.g. Vercel deployment)
  return 'https://urban-nest-1-tud1.onrender.com/api/v1';
}

export const CONFIG = {
  get API_BASE_URL() {
    return resolveApiBaseUrl();
  },
  setApiBaseUrl(url) {
    if (url && url.trim()) {
      localStorage.setItem('urbannest_api_base_url', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('urbannest_api_base_url');
    }
  },
  getSavedApiBaseUrl() {
    return localStorage.getItem('urbannest_api_base_url') || '';
  },
  APP_NAME: 'Urban Nest',
  DEFAULT_TOKEN_KEY: 'urbannest_auth_token',
  ACTIVE_VENTURE_KEY: 'urbannest_active_venture'
};


