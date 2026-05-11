import { NextResponse } from 'next/server';
import { sendClassMessage } from '@/lib/google-wallet';

export async function POST(req: Request) {
  try {
    const { slug, header, body } = await req.json();

    if (!slug || !header || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const classId = `marketif_loyalty_${slug}`;

    // Send the message to the class
    await sendClassMessage(classId, header, body);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
