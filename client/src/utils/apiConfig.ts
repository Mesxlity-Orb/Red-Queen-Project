// API Base URL helper for development & production deployments
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Automatically defaults to Render backend URL in production if VITE_API_BASE_URL is omitted
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 
  (isLocalhost ? '' : 'https://red-queen-server.onrender.com')).replace(/\/+$/, '');
