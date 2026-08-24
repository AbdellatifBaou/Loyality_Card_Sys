// Einfacher In-Memory Rate Limiter
const store = new Map<string, number[]>();

export function rateLimit(key: string, maxRequests: number, windowMs: number): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const timestamps = (store.get(key) || []).filter(t => t > windowStart);
  
  if (timestamps.length >= maxRequests) {
    return { success: false, remaining: 0 };
  }
  
  timestamps.push(now);
  store.set(key, timestamps);
  
  // Cleanup
  if (store.size > 10000) {
    for (const [k, v] of store) {
      const filtered = v.filter(t => t > now - 3600000);
      if (filtered.length === 0) store.delete(k);
      else store.set(k, filtered);
    }
  }
  
  return { success: true, remaining: maxRequests - timestamps.length };
}
