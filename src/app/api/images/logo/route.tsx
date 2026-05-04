import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const revalidate = 86400;

// Generates a properly square, padded logo for Google Wallet
// Google Wallet crops programLogo to a circle — padding prevents cut-off
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '288px',
          height: '288px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
          borderRadius: '50%',
          padding: '36px',
        }}
      >
        <img
          src={`${appUrl}/Aroma_logo.png`}
          width={216}
          height={216}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { width: 288, height: 288 }
  );
}
