import { NextResponse } from 'next/server';
import { getClientIp, checkAdminIpLockout, recordAdminFailedAttempt, resetAdminIpLockout } from '@/lib/ip-lockout';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const lockout = checkAdminIpLockout(ip);

    if (lockout.isLocked) {
      return NextResponse.json({
        error: `Diese IP-Adresse wurde nach 5 Fehlversuchen für 3 Tage gesperrt. Bitte warte noch ca. ${lockout.remainingHours} Stunden.`
      }, { status: 429 });
    }

    const { password } = await req.json();
    const correctPassword = process.env.ADMIN_API_KEY || '2025';

    if (!password || password !== correctPassword) {
      const attemptResult = recordAdminFailedAttempt(ip);
      if (attemptResult.isLocked) {
        return NextResponse.json({
          error: `Zu viele Fehlversuche! Diese IP-Adresse wurde für 3 Tage (72 Stunden) gesperrt.`
        }, { status: 429 });
      }
      return NextResponse.json({
        error: `Falsches Passwort. Noch ${attemptResult.remainingAttempts} Versuch(e) übrig, bevor die IP für 3 Tage gesperrt wird.`
      }, { status: 401 });
    }

    // Success: reset IP failed attempts
    resetAdminIpLockout(ip);

    return NextResponse.json({
      success: true,
      token: correctPassword
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
