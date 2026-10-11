import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { notifyApplePassUpdate } from '@/lib/apple-pass-registry';
import { getSignerCredentials } from '@/lib/apple-wallet';

/**
 * Debug endpoint: GET /api/debug/apple-wallet?serial=<wallet_object_id>&action=push
 * Shows registered devices and push tokens for a given pass serial number.
 * Can also send a live test push.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serial = searchParams.get('serial');
    const action = searchParams.get('action');

    let credsInfo: any = {};
    try {
      const creds = getSignerCredentials();
      credsInfo = {
        has_signer_cert: !!creds.signerCert,
        signer_cert_len: creds.signerCert?.length || 0,
        signer_cert_starts_with_pem: creds.signerCert?.startsWith('-----BEGIN') || false,
        has_signer_key: !!creds.signerKey,
        signer_key_len: creds.signerKey?.length || 0,
        signer_key_starts_with_pem: creds.signerKey?.startsWith('-----BEGIN') || false,
        source: (creds as any).source || 'unknown',
        has_wwdr: !!creds.wwdr,
      };
    } catch (e: any) {
      credsInfo = { error: e.message };
    }

    if (action === 'push' && serial) {
      const pushResult = await notifyApplePassUpdate(serial);
      return NextResponse.json({
        status: 'push_triggered',
        serial,
        creds_check: credsInfo,
        pushResult,
      });
    }

    const adminSupabase = getAdminSupabase();

    // Check if table exists by querying it
    const { data: registrations, error: regError } = await adminSupabase
      .from('apple_device_registrations_loyality')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (regError) {
      return NextResponse.json({
        error: 'Table does not exist or query failed',
        detail: regError.message,
        fix: 'Run the SQL in Supabase to create apple_device_registrations_loyality table',
      }, { status: 500 });
    }

    // Filter by serial if provided
    const filtered = serial
      ? (registrations || []).filter((r: any) => r.serial_number === serial)
      : (registrations || []);

    return NextResponse.json({
      status: 'ok',
      creds_check: credsInfo,
      table_exists: true,
      total_registrations: (registrations || []).length,
      filtered_by_serial: serial || 'none',
      registrations: filtered.map((r: any) => ({
        device_id: r.device_library_identifier?.slice(0, 10) + '...',
        pass_type: r.pass_type_identifier,
        serial_number: r.serial_number,
        push_token: r.push_token ? r.push_token.slice(0, 15) + '...' : 'MISSING',
        updated_at: new Date(r.updated_at).toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
