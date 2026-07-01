
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// SECURITY: Never expose the service role key to the client.
// The service role key bypasses Row Level Security and must only be used server-side.
// Admin operations should go through authenticated backend API endpoints instead.
export const supabaseAdmin = null;

// Fetch profiles visible to the current user.
// NOTE: supabaseAdmin is intentionally null (no service-role key in the browser),
// so this ALWAYS runs through the anon client and is governed by Row Level
// Security. The profiles SELECT policy scopes results to the caller's own
// workspace — this does NOT and must NOT return platform-wide data. For a true
// cross-workspace admin view, add an authenticated server endpoint that uses the
// service-role key behind an isAdmin check.
export async function fetchAllProfilesAdmin() {
  if (!supabaseAdmin) {
    const { supabase } = await import('./supabaseClient.js');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  }

  const BATCH = 1000;
  let from = 0;
  let all = [];
  
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + BATCH - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    all = [...all, ...data];
    if (data.length < BATCH) break;
    from += BATCH;
  }
  
  return { data: all, error: null };
}
