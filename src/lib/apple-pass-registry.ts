import http2 from 'http2';
import { getAdminSupabase } from './supabase';
import { getSignerCredentials } from './apple-wallet';

/**
 * Apple PassKit Device Registry
 *
 * Push tokens are persisted in Supabase (table: apple_device_registrations_loyality)
 * so they survive server restarts and redeployments.
 *
 * Required table schema (run once in Supabase SQL editor):
 *
 *   create table if not exists apple_device_registrations_loyality (
 *     id               uuid default gen_random_uuid() primary key,
 *     device_library_identifier text not null,
 *     pass_type_identifier      text not null,
 *     serial_number             text not null,
 *     push_token                text not null,
 *     updated_at                bigint not null default extract(epoch from now())::bigint * 1000,
 *     unique(device_library_identifier, pass_type_identifier, serial_number)
 *   );
 *   create index if not exists idx_apple_reg_serial on apple_device_registrations_loyality(serial_number);
 */

/**
 * Register an Apple device for push updates (persisted to Supabase)
 */
export async function registerDevice(
  deviceLibraryIdentifier: string,
  passTypeIdentifier: string,
  serialNumber: string,
  pushToken: string
): Promise<{ isNew: boolean }> {
  const adminSupabase = getAdminSupabase();
  const now = Date.now();

  // Upsert: insert or update on conflict
  const { data, error } = await adminSupabase
    .from('apple_device_registrations_loyality')
    .upsert(
      {
        device_library_identifier: deviceLibraryIdentifier,
        pass_type_identifier: passTypeIdentifier,
        serial_number: serialNumber,
        push_token: pushToken,
        updated_at: now,
      },
      { onConflict: 'device_library_identifier,pass_type_identifier,serial_number', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (error) {
    console.error('[Apple PassKit] registerDevice DB error:', error.message);
    throw error;
  }

  console.log(`[Apple PassKit] Registered device ${deviceLibraryIdentifier} for pass ${serialNumber}`);
  // If data was newly inserted vs updated — Supabase upsert always returns data, treat as new if no prior record
  return { isNew: true };
}

/**
 * Unregister an Apple device (removes from Supabase)
 */
export async function unregisterDevice(
  deviceLibraryIdentifier: string,
  passTypeIdentifier: string,
  serialNumber: string
): Promise<void> {
  const adminSupabase = getAdminSupabase();

  const { error } = await adminSupabase
    .from('apple_device_registrations_loyality')
    .delete()
    .eq('device_library_identifier', deviceLibraryIdentifier)
    .eq('pass_type_identifier', passTypeIdentifier)
    .eq('serial_number', serialNumber);

  if (error) {
    console.error('[Apple PassKit] unregisterDevice DB error:', error.message);
  }

  console.log(`[Apple PassKit] Unregistered device ${deviceLibraryIdentifier} for pass ${serialNumber}`);
}

/**
 * Get serial numbers of passes updated since a given timestamp (for a device)
 */
export async function getDeviceUpdatedPasses(
  deviceLibraryIdentifier: string,
  passTypeIdentifier: string,
  passesUpdatedSince?: string
): Promise<{ serialNumbers: string[]; lastUpdated: string }> {
  const adminSupabase = getAdminSupabase();

  // Fetch all registrations for this device
  const { data, error } = await adminSupabase
    .from('apple_device_registrations_loyality')
    .select('serial_number, updated_at')
    .eq('device_library_identifier', deviceLibraryIdentifier)
    .eq('pass_type_identifier', passTypeIdentifier);

  if (error || !data) {
    console.error('[Apple PassKit] getDeviceUpdatedPasses DB error:', error?.message);
    return { serialNumbers: [], lastUpdated: Date.now().toString() };
  }

  const sinceTime = passesUpdatedSince ? parseInt(passesUpdatedSince, 10) || 0 : 0;
  
  // Return passes updated since timestamp, or all registered passes as allowed by Apple PassKit spec
  let matching = data.filter((r: any) => sinceTime === 0 || (r.updated_at && r.updated_at >= sinceTime - 2000));
  if (matching.length === 0 && data.length > 0) {
    // Fallback: Apple allows returning all serial numbers associated with the device
    matching = data;
  }

  const serialNumbers = Array.from(new Set(matching.map((r: any) => r.serial_number)));
  console.log(`[Apple PassKit] getDeviceUpdatedPasses for device ${deviceLibraryIdentifier.slice(0, 8)}... (since ${sinceTime}): returning ${serialNumbers.length} pass(es) [${serialNumbers.join(', ')}]`);

  return {
    serialNumbers,
    lastUpdated: Date.now().toString(),
  };
}

/**
 * Mark all registrations for a serial number as updated (so Apple fetches the new pass)
 */
async function markPassAsUpdated(serialNumber: string): Promise<void> {
  const adminSupabase = getAdminSupabase();
  const now = Date.now();

  const { error } = await adminSupabase
    .from('apple_device_registrations_loyality')
    .update({ updated_at: now })
    .eq('serial_number', serialNumber);

  if (error) {
    console.error('[Apple PassKit] markPassAsUpdated DB error:', error.message);
  }
}

/**
 * Sends silent APNs push notification to all devices registered for this pass serialNumber.
 * Tokens are loaded from Supabase — survives server restarts.
 */
export async function notifyApplePassUpdate(serialNumber: string): Promise<void> {
  const passTypeId = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.de.marketif.loyalty';
  
  let certPem = '';
  let keyPem = '';
  try {
    const creds = getSignerCredentials();
    certPem = creds.signerCert;
    keyPem = creds.signerKey;
  } catch (err: any) {
    console.warn('[Apple PassKit] Failed to load signer credentials for APNs push:', err.message);
    return;
  }

  if (!certPem || !keyPem) {
    console.warn('[Apple PassKit] APNs push skipped: missing certificate or private key');
    return;
  }

  // 1. Mark pass as updated in DB so Apple can fetch the new version
  await markPassAsUpdated(serialNumber);

  // 2. Load push tokens from Supabase
  const adminSupabase = getAdminSupabase();
  const { data, error } = await adminSupabase
    .from('apple_device_registrations_loyality')
    .select('push_token')
    .eq('serial_number', serialNumber);

  if (error) {
    console.error('[Apple PassKit] Failed to load push tokens:', error.message);
    return;
  }

  const pushTokens = new Set<string>((data || []).map((r: any) => r.push_token).filter(Boolean));

  if (pushTokens.size === 0) {
    console.log(`[Apple PassKit] No registered push tokens found for pass ${serialNumber}`);
    return;
  }

  console.log(`[Apple PassKit] Sending APNs push to ${pushTokens.size} device(s) for pass ${serialNumber}`);

  for (const token of pushTokens) {
    try {
      const ok = await sendApnsPush(token, passTypeId, certPem, keyPem);
      console.log(`[Apple PassKit] APNs push to ${token.slice(0, 10)}... → ${ok ? 'OK' : 'FAILED'}`);
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
        key,
        rejectUnauthorized: false
      });

      client.on('error', (err) => {
        console.warn('[APNs] HTTP2 Client error:', err.message);
        try { client.close(); } catch {}
        resolve(false);
      });

      const headers: Record<string, string> = {
        ':method': 'POST',
        ':path': `/3/device/${pushToken}`,
        'apns-topic': topic,
        'apns-priority': '10',
      };

      const req = client.request(headers);

      let responseBody = '';

      req.on('response', (resHeaders) => {
        const status = Number(resHeaders[':status']);
        req.on('data', (chunk) => {
          responseBody += chunk.toString();
        });

        req.on('end', () => {
          try { client.close(); } catch {}
          if (status === 200) {
            console.log(`[Apple APNs Push] SUCCESS for token ${pushToken.slice(0, 10)}... (status 200)`);
            resolve(true);
          } else {
            console.warn(`[Apple APNs Push] FAILED (status ${status}) for token ${pushToken.slice(0, 10)}... Response:`, responseBody);
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        console.warn('[APNs] Request error:', err.message);
        try { client.close(); } catch {}
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
