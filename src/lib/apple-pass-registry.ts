import http2 from 'http2';
import { getAdminSupabase } from './supabase';

interface DeviceRegistration {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
  pushToken: string;
  updatedAt: number;
}

// In-memory registry fallback for fast lookup
const deviceStore = new Map<string, DeviceRegistration>();

function getKey(deviceLibraryIdentifier: string, passTypeIdentifier: string, serialNumber: string) {
  return `${deviceLibraryIdentifier}:${passTypeIdentifier}:${serialNumber}`;
}

/**
 * Register an Apple device for push updates
 */
export async function registerDevice(
  deviceLibraryIdentifier: string,
  passTypeIdentifier: string,
  serialNumber: string,
  pushToken: string
): Promise<{ isNew: boolean }> {
  const key = getKey(deviceLibraryIdentifier, passTypeIdentifier, serialNumber);
  const exists = deviceStore.has(key);

  const reg: DeviceRegistration = {
    deviceLibraryIdentifier,
    passTypeIdentifier,
    serialNumber,
    pushToken,
    updatedAt: Date.now()
  };

  deviceStore.set(key, reg);
  console.log(`[Apple PassKit] Registered device ${deviceLibraryIdentifier} for pass ${serialNumber}`);

  return { isNew: !exists };
}

/**
 * Unregister an Apple device
 */
export async function unregisterDevice(
  deviceLibraryIdentifier: string,
  passTypeIdentifier: string,
  serialNumber: string
): Promise<void> {
  const key = getKey(deviceLibraryIdentifier, passTypeIdentifier, serialNumber);
  deviceStore.delete(key);
  console.log(`[Apple PassKit] Unregistered device ${deviceLibraryIdentifier} for pass ${serialNumber}`);
}

/**
 * Get serial numbers of passes updated for this device
 */
export async function getDeviceUpdatedPasses(
  deviceLibraryIdentifier: string,
  passTypeIdentifier: string,
  passesUpdatedSince?: string
): Promise<{ serialNumbers: string[]; lastUpdated: string }> {
  const matchingSerials = new Set<string>();
  const sinceTime = passesUpdatedSince ? parseInt(passesUpdatedSince, 10) || 0 : 0;

  for (const reg of deviceStore.values()) {
    if (reg.deviceLibraryIdentifier === deviceLibraryIdentifier && reg.passTypeIdentifier === passTypeIdentifier) {
      if (reg.updatedAt > sinceTime) {
        matchingSerials.add(reg.serialNumber);
      }
    }
  }

  // If in-memory had none (e.g. after server restart), check if customer exists in DB
  if (matchingSerials.size === 0) {
    try {
      const adminSupabase = getAdminSupabase();
      const { data: customer } = await adminSupabase
        .from('customers_loyality')
        .select('wallet_object_id, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (customer) {
        customer.forEach((c: any) => {
          if (c.wallet_object_id) matchingSerials.add(c.wallet_object_id);
        });
      }
    } catch (e) {
      // Ignore DB fallback error
    }
  }

  return {
    serialNumbers: Array.from(matchingSerials),
    lastUpdated: Date.now().toString()
  };
}

/**
 * Sends silent APNs push notification to all devices registered for this pass serialNumber
 */
export async function notifyApplePassUpdate(serialNumber: string): Promise<void> {
  const passTypeId = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.de.marketif.loyalty';
  const certPem = process.env.APPLE_PASS_SIGNER_CERT_PEM;
  const keyPem = process.env.APPLE_PASS_SIGNER_KEY_PEM;

  if (!certPem || !keyPem) {
    console.warn('[Apple PassKit] APNs push skipped: missing APPLE_PASS_SIGNER_CERT_PEM / KEY_PEM');
    return;
  }

  // Update timestamps in registry
  for (const reg of deviceStore.values()) {
    if (reg.serialNumber === serialNumber) {
      reg.updatedAt = Date.now();
    }
  }

  // Collect push tokens for this serial number
  const pushTokens = new Set<string>();
  for (const reg of deviceStore.values()) {
    if (reg.serialNumber === serialNumber && reg.pushToken) {
      pushTokens.add(reg.pushToken);
    }
  }

  if (pushTokens.size === 0) {
    console.log(`[Apple PassKit] No registered push tokens found for pass ${serialNumber}`);
    return;
  }

  // Send APNs HTTP/2 push notification to each registered device
  const cleanedCert = certPem.includes('\\n') ? certPem.replace(/\\n/g, '\n') : certPem;
  const cleanedKey = keyPem.includes('\\n') ? keyPem.replace(/\\n/g, '\n') : keyPem;

  for (const token of pushTokens) {
    try {
      await sendApnsPush(token, passTypeId, cleanedCert, cleanedKey);
    } catch (err: any) {
      console.warn(`[Apple PassKit] APNs push error for token ${token.slice(0, 8)}...:`, err.message);
    }
  }
}

function sendApnsPush(pushToken: string, topic: string, cert: string, key: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const client = http2.connect('https://api.push.apple.com', {
        cert,
        key
      });

      client.on('error', (err) => {
        console.warn('[APNs] HTTP2 Client error:', err.message);
        client.close();
        resolve(false);
      });

      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${pushToken}`,
        'apns-topic': topic,
        'apns-push-type': 'background',
        'apns-priority': '10',
        'apns-expiration': '0'
      });

      req.on('response', (headers) => {
        const status = headers[':status'];
        console.log(`[Apple APNs Push] Token ${pushToken.slice(0, 10)}... status: ${status}`);
        client.close();
        resolve(status === 200);
      });

      req.on('error', (err) => {
        console.warn('[APNs] Request error:', err.message);
        client.close();
        resolve(false);
      });

      req.write(JSON.stringify({}));
      req.end();
    } catch (e: any) {
      console.warn('[APNs] Execution error:', e.message);
      resolve(false);
    }
  });
}
