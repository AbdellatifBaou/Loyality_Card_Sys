import { NextResponse } from 'next/server';
import { getWalletDiagnostics } from '@/lib/google-wallet';

export async function GET() {
  const diag = getWalletDiagnostics();
  return NextResponse.json(diag);
}
