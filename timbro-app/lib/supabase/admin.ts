import { createClient } from '@supabase/supabase-js';

// Solo servidor. Requiere SUPABASE_SERVICE_ROLE_KEY. Se usa únicamente para borrar al usuario de Auth.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
