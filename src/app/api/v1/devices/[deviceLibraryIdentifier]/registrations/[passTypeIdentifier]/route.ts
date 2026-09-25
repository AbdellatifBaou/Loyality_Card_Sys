import { NextResponse } from 'next/server';
import { getDeviceUpdatedPasses } from '@/lib/apple-pass-registry';

export async function GET(
  req: Request,
  context: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier } = await context.params;
    const { searchParams } = new URL(req.url);
    const passesUpdatedSince = searchParams.get('passesUpdatedSince') || undefined;

    const result = await getDeviceUpdatedPasses(deviceLibraryIdentifier, passTypeIdentifier, passesUpdatedSince);

    if (result.serialNumbers.length === 0) {
      return new Response(null, { status: 204 });
    }

    return NextResponse.json({
      serialNumbers: result.serialNumbers,
      lastUpdated: result.lastUpdated
    });
  } catch (err: any) {
    console.error('[Apple PassKit Device Passes Error]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}