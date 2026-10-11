import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';

/**
 * Debug endpoint: GET /api/debug/apple-wallet?serial=<wallet_object_id>
 * Shows registered devices and push tokens for a given pass serial number.
 * Remove or protect this endpoint in production after debugging.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serial = searchParams.get('serial');

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
