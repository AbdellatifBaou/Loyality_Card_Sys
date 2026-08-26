import { createClient } from '@supabase/supabase-js';

export async function validateAuth(
  req: Request, 
  requiredMerchantId?: string
): Promise<{ authorized: boolean; error?: string; isAdmin?: boolean; staffId?: string }> {
  
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Unauthorized: Missing or invalid Authorization header' };
  }

  const token = authHeader.split(' ')[1];
  
  // 1. Check Global Admin Password
  if (token === (process.env.ADMIN_API_KEY || '2025')) {
    return { authorized: true, isAdmin: true };
  }

  // 2. If it's not the admin and we don't have a specific merchant to check against, deny access
  if (!requiredMerchantId) {
    return { authorized: false, error: 'Unauthorized: Admin access required.' };
  }

  // 3. Validate Merchant Staff PIN
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: staff, error } = await adminSupabase
    .from('staff_loyality')
    .select('id, merchant_id')
    .eq('pin', token)
    .eq('merchant_id', requiredMerchantId)
    .single();

  if (error || !staff) {
    return { authorized: false, error: 'Unauthorized: Invalid PIN for this merchant' };
  }

  return { authorized: true, isAdmin: false, staffId: staff.id };
}
