// In-memory + sliding IP lockout tracker for Admin Dashboard (5 failed attempts = 3-day ban)

interface IpLockoutRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const ipStore = new Map<string, IpLockoutRecord>();
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours
const MAX_ADMIN_ATTEMPTS = 5;

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || '127.0.0.1';
}

export function checkAdminIpLockout(ip: string): { isLocked: boolean; remainingHours?: number; remainingAttempts?: number } {
  const now = Date.now();
  const record = ipStore.get(ip);

  if (!record) {
    return { isLocked: false, remainingAttempts: MAX_ADMIN_ATTEMPTS };
  }

  // Check if actively locked
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMs = record.lockedUntil - now;
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    return { isLocked: true, remainingHours };
  }

  // If lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    ipStore.delete(ip);
    return { isLocked: false, remainingAttempts: MAX_ADMIN_ATTEMPTS };
  }

  // If attempts older than 3 days, reset
  if (now - record.firstAttemptAt > THREE_DAYS_MS) {
    ipStore.delete(ip);
    return { isLocked: false, remainingAttempts: MAX_ADMIN_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ADMIN_ATTEMPTS - record.attempts);
  return { isLocked: false, remainingAttempts: remaining };
}

export function recordAdminFailedAttempt(ip: string): { isLocked: boolean; attempts: number; remainingAttempts: number; remainingHours?: number } {
  const now = Date.now();
  let record = ipStore.get(ip);

  if (!record || (now - record.firstAttemptAt > THREE_DAYS_MS && !record.lockedUntil)) {
    record = {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: null
    };
  } else {
    record.attempts += 1;
  }

  if (record.attempts >= MAX_ADMIN_ATTEMPTS) {
    record.lockedUntil = now + THREE_DAYS_MS;
    ipStore.set(ip, record);
    return {
      isLocked: true,
      attempts: record.attempts,
      remainingAttempts: 0,
      remainingHours: 72
    };
  }

  ipStore.set(ip, record);
  return {
    isLocked: false,
    attempts: record.attempts,
    remainingAttempts: MAX_ADMIN_ATTEMPTS - record.attempts
  };
}

export function resetAdminIpLockout(ip: string): void {
  ipStore.delete(ip);
}
