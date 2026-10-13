import http2 from 'http2';
import tls from 'tls';
import crypto from 'crypto';
import { getAdminSupabase } from './supabase';
import { getSignerCredentials, repairFlattenedPem } from './apple-wallet';

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

  // Find customer to see if there is an alternate ID (id vs wallet_object_id)
  const { data: customer } = await adminSupabase
    .from('customers_loyality')
    .select('id, wallet_object_id')
    .or(`id.eq.${serialNumber},wallet_object_id.eq.${serialNumber}`)
    .maybeSingle();

  const serials = new Set<string>([serialNumber]);
  if (customer) {
    if (customer.id) serials.add(customer.id);
    if (customer.wallet_object_id) serials.add(customer.wallet_object_id);
  }

  const { error } = await adminSupabase
    .from('apple_device_registrations_loyality')
    .delete()
    .eq('device_library_identifier', deviceLibraryIdentifier)
    .eq('pass_type_identifier', passTypeIdentifier)
    .in('serial_number', Array.from(serials));

  if (error) {
    console.error('[Apple PassKit] unregisterDevice DB error:', error.message);
  }

  console.log(`[Apple PassKit] Unregistered device ${deviceLibraryIdentifier} for pass(es): ${Array.from(serials).join(', ')}`);
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

  if (error || !data || data.length === 0) {
    console.log(`[Apple PassKit] getDeviceUpdatedPasses for device ${deviceLibraryIdentifier.slice(0, 8)}...: no passes found`);
    return { serialNumbers: [], lastUpdated: Math.floor(Date.now() / 1000).toString() };
  }

  // Apple PassKit spec: if passesUpdatedSince is provided, return only passes modified after that tag
  let filtered = data;
  if (passesUpdatedSince) {
    const sinceNum = parseInt(passesUpdatedSince, 10);
    if (!isNaN(sinceNum)) {
      // In DB, updated_at is stored in ms. If passesUpdatedSince is in seconds, convert to ms
      const sinceMs = sinceNum < 10000000000 ? sinceNum * 1000 : sinceNum;
      filtered = data.filter((r: any) => Number(r.updated_at) > sinceMs);
    }
  }

  const serialNumbers = Array.from(new Set(filtered.map((r: any) => r.serial_number)));
  const nowTag = Math.floor(Date.now() / 1000).toString();
  console.log(`[Apple PassKit] getDeviceUpdatedPasses for device ${deviceLibraryIdentifier.slice(0, 8)}...: returning ${serialNumbers.length} pass(es) [${serialNumbers.join(', ')}] (passesUpdatedSince: ${passesUpdatedSince || 'none'})`);

  return {
    serialNumbers,
    lastUpdated: nowTag,
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
export async function notifyApplePassUpdate(serialNumber: string): Promise<{ sent: number; tokens: string[]; details: any[] }> {
  const passTypeId = process.env.APPLE_PASS_TYPE_IDENTIFIER || 'pass.de.marketif.loyalty';
  
  let certPem = '';
  let keyPem = '';
  try {
    const creds = getSignerCredentials();
    certPem = creds.signerCert;
    keyPem = creds.signerKey;
  } catch (err: any) {
    console.warn('[Apple PassKit] Failed to load signer credentials for APNs push:', err.message);
    return { sent: 0, tokens: [], details: [{ error: `Credentials load error: ${err.message}` }] };
  }

  if (!certPem || !keyPem || !certPem.includes('-----BEGIN') || !keyPem.includes('-----BEGIN')) {
    const errDesc = `Invalid PEM format - cert starts with: '${certPem?.slice(0, 20)}' (len: ${certPem?.length}), key starts with: '${keyPem?.slice(0, 20)}' (len: ${keyPem?.length})`;
    console.warn('[Apple PassKit] APNs push skipped: ' + errDesc);
    return { sent: 0, tokens: [], details: [{ error: errDesc }] };
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
    return { sent: 0, tokens: [], details: [{ error: `DB query error: ${error.message}` }] };
  }

  // Filter out any invalid non-hex tokens (APNs tokens are exactly 64 hex characters)
  const pushTokens = Array.from(new Set<string>(
    (data || [])
      .map((r: any) => r.push_token)
      .filter((t: string) => t && /^[0-9a-fA-F]{64}$/.test(t))
  ));

  if (pushTokens.length === 0) {
    console.log(`[Apple PassKit] No valid APNs push tokens found for pass ${serialNumber}`);
    return { sent: 0, tokens: [], details: [{ message: 'No valid 64-char hex tokens found' }] };
  }

  console.log(`[Apple PassKit] Sending APNs push to ${pushTokens.length} device(s) for pass ${serialNumber}`);

  let successCount = 0;
  const details: any[] = [];
  for (const token of pushTokens) {
    try {
      const res = await sendApnsPush(token, passTypeId, certPem, keyPem);
      console.log(`[Apple PassKit] APNs push to ${token.slice(0, 10)}... → ${res.ok ? 'OK (200)' : 'FAILED: ' + (res.error || res.status)}`);
      if (res.ok) successCount++;
      details.push({ token: token.slice(0, 10) + '...', ...res });
    } catch (err: any) {
      console.warn(`[Apple PassKit] APNs push error for token ${token.slice(0, 8)}...:`, err.message);
      details.push({ token: token.slice(0, 10) + '...', ok: false, error: err.message });
    }
  }

  const logs = ((globalThis as any).__appleLogs = (globalThis as any).__appleLogs || []);
  logs.unshift({
    timestamp: new Date().toISOString(),
    type: 'apns_push_dispatched',
    serialNumber,
    sent: successCount,
    tokensCount: pushTokens.length,
    details,
  });
  if (logs.length > 50) logs.pop();

  return { sent: successCount, tokens: pushTokens, details };
}

function sendApnsPush(pushToken: string, topic: string, cert: string, key: string): Promise<{ ok: boolean; status?: number; error?: string; body?: string }> {
  return new Promise((resolve) => {
    let client: http2.ClientHttp2Session | null = null;
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        try { if (client) client.close(); } catch {}
        resolve({ ok: false, error: 'APNs connection timeout (5s)' });
      }
    }, 5000);

    try {
      // 1. Normalize Certificate via repairFlattenedPem and native Node.js X509 parser
      let cleanCert = repairFlattenedPem(cert);
      let x509Error = '';
      try {
        const x509 = new crypto.X509Certificate(cleanCert);
        cleanCert = x509.toString().trim();
      } catch (xErr: any) {
        x509Error = xErr.message;
        console.warn('[APNs] X509 re-serialization note:', xErr.message);
      }

      // 2. Normalize Private Key via repairFlattenedPem and standard PKCS#8 PEM
      let cleanKey = repairFlattenedPem(key);
      let keyError = '';
      try {
        const parsedKey = crypto.createPrivateKey(cleanKey);
        cleanKey = parsedKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim();
      } catch (kErr: any) {
        keyError = kErr.message;
        console.warn('[APNs] PKCS8 conversion note:', kErr.message);
      }

      // 3. Pre-flight check cert + key pair together
      try {
        tls.createSecureContext({ cert: cleanCert, key: cleanKey });
      } catch (pairErr: any) {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          return resolve({
            ok: false,
            error: `Cert/Key pair error: ${pairErr.message}`,
            diag: {
              cert_len: cleanCert.length,
              key_len: cleanKey.length,
              cert_header: cleanCert.slice(0, 30),
              key_header: cleanKey.slice(0, 30),
              x509_err: x509Error || 'ok',
              key_err: keyError || 'ok'
            }
          });
        }
      }

      client = http2.connect('https://api.push.apple.com', {
        cert: cleanCert,
        key: cleanKey,
        rejectUnauthorized: false
      });

      client.on('error', (err) => {
        console.warn('[APNs] HTTP2 Client error:', err.message);
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          try { if (client) client.close(); } catch {}
          resolve({ ok: false, error: `Client error: ${err.message}` });
        }
      });

      const headers: Record<string, string> = {
        ':method': 'POST',
        ':path': `/3/device/${pushToken}`,
        'apns-topic': topic,
        'apns-push-type': 'background',
        'apns-priority': '5',
        'apns-expiration': '0',
      };

      const req = client.request(headers);

      let responseBody = '';

      req.on('response', (resHeaders) => {
        const status = Number(resHeaders[':status']);
        req.on('data', (chunk) => {
          responseBody += chunk.toString();
        });

        req.on('end', () => {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            try { if (client) client.close(); } catch {}
            if (status === 200) {
              console.log(`[Apple APNs Push] SUCCESS for token ${pushToken.slice(0, 10)}... (status 200)`);
              resolve({ ok: true, status });
            } else {
              console.warn(`[Apple APNs Push] FAILED (status ${status}) for token ${pushToken.slice(0, 10)}... Response:`, responseBody);
              resolve({ ok: false, status, body: responseBody });
            }
          }
        });
      });

      req.on('error', (err) => {
        console.warn('[APNs] Request error:', err.message);
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          try { if (client) client.close(); } catch {}
          resolve({ ok: false, error: `Request error: ${err.message}` });
        }
      });

      req.write('{}');
      req.end();
    } catch (e: any) {
      console.warn('[APNs] Execution error:', e.message);
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({ ok: false, error: `Execution error: ${e.message}` });
      }
    }
  });
}
