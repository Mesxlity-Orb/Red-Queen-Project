// API Base URL helper for development & production deployments
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Points to the Render backend in production. In local dev the Vite proxy handles /api/* automatically.
export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string) || 
  (isLocalhost ? '' : 'https://red-queen-server.onrender.com')
).replace(/\/+$/, '');

/**
 * apiFetch: fetch wrapper that handles Render cold-start retries.
 * The Render free tier sleeps after ~15 min of inactivity. The first
 * request after sleep can take 20-60s. We send up to 3 tries with a
 * 25-second timeout each before giving up.
 */
export async function apiFetch(path: string, options?: RequestInit, retries = 3): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    // 30-second timeout per attempt – enough to survive a Render cold start
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (attempt === retries) throw err;
      // Brief wait before next retry
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Unreachable but satisfies TypeScript
  throw new Error('Request failed after retries');
}

/**
 * pingBackend: fire-and-forget GET to wake the Render instance.
 * Call this early (e.g. on app mount) so it's warm by the time the user sends a message.
 */
export async function pingBackend(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/`, { method: 'GET' });
  } catch {
    // Silently ignore – this is just a warm-up call
  }
}

