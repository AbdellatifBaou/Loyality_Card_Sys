import { NextResponse } from 'next/server';

export async function GET() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  let issuerId = process.env.GOOGLE_ISSUER_ID || '';
  
  if (!raw) return NextResponse.json({ error: 'No env var' });

  try {
    const creds = JSON.parse(raw);
    const pk = creds.private_key || '';
    
    return NextResponse.json({
      success: true,
      issuerId: issuerId,
      issuerIdLength: issuerId.length,
      issuerIdHex: Array.from(issuerId).map(c => c.charCodeAt(0).toString(16)).join(' '),
      email: creds.client_email,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Parse failed', msg: e.message });
  }
}
