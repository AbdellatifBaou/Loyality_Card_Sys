import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return NextResponse.json({ error: 'No env var' });

  try {
    const creds = JSON.parse(raw);
    const pk = creds.private_key || '';
    
    // Check how the newlines look
    const hasLiteralNewline = pk.includes('\n');
    const hasEscapedNewline = pk.includes('\\n');
    const startOfKey = pk.substring(0, 40);
    
    return NextResponse.json({
      success: true,
      hasLiteralNewline,
      hasEscapedNewline,
      startOfKey,
      email: creds.client_email,
      rawType: typeof raw,
      rawLength: raw.length
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Parse failed', msg: e.message });
  }
}
