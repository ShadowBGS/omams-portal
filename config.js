/* ============================================================
   OMAMS – Configuration  |  config.js
   ============================================================
   
   Environment-specific configuration.
   This file should be committed but contains only public info.
   Override settings using config.production.js for production.
   ============================================================ */

const CONFIG = {
  // API Configuration
  // For development: 'http://localhost:8000'
  // For production: Set via config.production.js or environment
  apiBaseUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:8000'
    : (window.ENV?.API_URL || ''),

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
