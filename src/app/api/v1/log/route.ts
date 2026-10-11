import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[Apple PassKit Device Log]:', JSON.stringify(body));
    const logs = ((globalThis as any).__appleLogs = (globalThis as any).__appleLogs || []);
    logs.unshift({ timestamp: new Date().toISOString(), type: 'device_error_log', body });
    if (logs.length > 50) logs.pop();
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'ok' });
  }
}
