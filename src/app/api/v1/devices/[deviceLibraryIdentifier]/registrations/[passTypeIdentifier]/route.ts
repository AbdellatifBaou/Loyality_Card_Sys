import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  context: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string }> }
) {
  try {
    return NextResponse.json({
      serialNumbers: [],
      lastUpdated: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}