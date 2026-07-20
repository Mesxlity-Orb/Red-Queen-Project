// Resolves the backend base URL.
// In development: returns '' so Vite's proxy forwards /api/* → localhost:3000
// In production:  returns whatever VITE_API_URL env var was set at build time
//                 (e.g. https://your-backend.railway.app)
declare const __API_BASE__: string;

export const API_BASE: string =
  typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : '';

/**
 * Wrapper around fetch that automatically prefixes the correct backend URL.
 * Usage: apiFetch('/api/chat', { method: 'POST', ... })
 */
export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = `${API_BASE}${path}`;
  return fetch(url, options);
}
