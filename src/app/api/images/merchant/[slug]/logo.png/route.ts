import { serveMerchantLogo } from '@/lib/logo-image';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  return await serveMerchantLogo(slug);
}
