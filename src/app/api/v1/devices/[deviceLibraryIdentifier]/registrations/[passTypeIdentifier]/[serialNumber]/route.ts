import { NextResponse } from 'next/server';
import { registerDevice, unregisterDevice } from '@/lib/apple-pass-registry';

export async function POST(
  req: Request,
  context: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await context.params;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('ApplePass ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const pushToken = body.pushToken || '';

    const { isNew } = await registerDevice(deviceLibraryIdentifier, passTypeIdentifier, serialNumber, pushToken);

    return NextResponse.json({ status: 'registered' }, { status: isNew ? 201 : 200 });
  } catch (err: any) {
    console.error('[Apple PassKit Registration Error]:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await context.params;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('ApplePass ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await unregisterDevice(deviceLibraryIdentifier, passTypeIdentifier, serialNumber);
    return NextResponse.json({ status: 'unregistered' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}