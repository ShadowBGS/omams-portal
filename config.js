/* ============================================================
   OMAMS – Configuration  |  config.js
   ============================================================
   
   Environment-specific configuration.
   This file should be committed but contains only public info.
   Override settings using config.production.js for production.
   ============================================================ */

const DEFAULT_PROD_API_URL = 'https://att-back-0xvj.onrender.com';

function normalizeApiUrl(url) {
  if (!url || typeof url !== 'string') return '';
  // Remove trailing slashes so paths concatenate reliably.
  return url.trim().replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const isLocal = window.location.hostname === 'localhost';
  if (isLocal) return 'http://localhost:8000';

  const configured = normalizeApiUrl(window.ENV?.API_URL);
  const fallback = normalizeApiUrl(DEFAULT_PROD_API_URL);

  if (!configured) return fallback;

  try {
    const configuredUrl = new URL(configured);
    const currentHost = window.location.host;
    const configuredHost = configuredUrl.host;
    const configuredPath = configuredUrl.pathname.replace(/\/+$/, '');

    // Guard against pointing API_URL to the portal host root.
    if (configuredHost === currentHost && (configuredPath === '' || configuredPath === '/')) {
      console.warn('[CONFIG] API_URL points to portal host; falling back to backend URL.');
      return fallback;
    }
  } catch (_) {
    console.warn('[CONFIG] Invalid API_URL; falling back to backend URL.');
    return fallback;
  }

  return configured;
}

const CONFIG = {
  // API Configuration
  // For development: 'http://localhost:8000'
  // For production: Set via config.production.js or environment
  apiBaseUrl: resolveApiBaseUrl(),

  // Firebase Configuration
  // These are PUBLIC keys - it's safe to commit them
  // Security is enforced via Firebase Security Rules
  firebase: {
    apiKey: 'AIzaSyDUDc7RPDJ3gzzq1pdvyEH9lkwP3IIzMLI',
    authDomain: 'attendance-4e2af.firebaseapp.com',
    projectId: 'attendance-4e2af',
    storageBucket: 'attendance-4e2af.firebasestorage.app',
    messagingSenderId: '926177753172',
    appId: '1:926177753172:web:9ba7922c085e400f3655c1',
  },

  // Feature flags
  features: {
    enablePerformanceMonitoring: window.location.hostname === 'localhost',
    enableDebugLogging: window.location.hostname === 'localhost',
  },

  // App metadata
  app: {
    name: 'OMAMS Attendance Portal',
    version: '2.0.0',
  },
};

// Optional: Load production overrides if available
// This allows injecting environment-specific config without modifying this file
if (typeof window.PRODUCTION_CONFIG !== 'undefined') {
  Object.assign(CONFIG, window.PRODUCTION_CONFIG);
}

// Freeze config to prevent runtime modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.firebase);
Object.freeze(CONFIG.features);
Object.freeze(CONFIG.app);
