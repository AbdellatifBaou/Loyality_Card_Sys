import { NextResponse } from 'next/server';
import { registerDevice, unregisterDevice } from '@/lib/apple-pass-registry';

export async function POST(
  req: Request,
  context: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await context.params;
    const body = await req.json().catch(() => ({}));
    const pushToken = body.pushToken || '';

    const { isNew } = await registerDevice(deviceLibraryIdentifier, passTypeIdentifier, serialNumber, pushToken);

    const logs = ((globalThis as any).__appleLogs = (globalThis as any).__appleLogs || []);
    logs.unshift({
      timestamp: new Date().toISOString(),
      type: 'device_registration_event',
      device: deviceLibraryIdentifier.slice(0, 10) + '...',
      serialNumber,
      isNew,
    });
    if (logs.length > 50) logs.pop();

    return new Response(null, { status: isNew ? 201 : 200 });
  } catch (err: any) {
    console.error('[Apple PassKit Registration Error]:', err);
    return new Response(null, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await context.params;
    await unregisterDevice(deviceLibraryIdentifier, passTypeIdentifier, serialNumber);

    const logs = ((globalThis as any).__appleLogs = (globalThis as any).__appleLogs || []);
    logs.unshift({
      timestamp: new Date().toISOString(),
      type: 'device_unregistered_event',
      device: deviceLibraryIdentifier.slice(0, 10) + '...',
      serialNumber,
    });
    if (logs.length > 50) logs.pop();

    return new Response(null, { status: 200 });
  } catch (err: any) {
    return new Response(null, { status: 500 });
  }
}