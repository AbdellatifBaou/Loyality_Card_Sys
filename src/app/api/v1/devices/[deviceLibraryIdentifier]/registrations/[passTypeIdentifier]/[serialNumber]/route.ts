import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  context: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, serialNumber } = await context.params;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('ApplePass ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Apple PassKit Registration]: Device ${deviceLibraryIdentifier} registered for pass ${serialNumber}`);
    return NextResponse.json({ status: 'registered' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, serialNumber } = await context.params;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('ApplePass ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Apple PassKit Unregistration]: Device ${deviceLibraryIdentifier} unregistered from pass ${serialNumber}`);
    return NextResponse.json({ status: 'unregistered' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}