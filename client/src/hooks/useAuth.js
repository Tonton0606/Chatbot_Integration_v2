import { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { signOutAndRevoke } from '../services/auth/authActions';

/**
 * useAuth — session state only.
 *
 * This hook exposes the current Supabase session and a safe signOut.
 * It intentionally does NOT expose signIn/signUp: all authentication flows
 * must go through the AuthContainer/authActions pipeline which enforces OTP
 * two-factor verification before granting access. Bypassing that by calling
 * supabase.auth.signInWithPassword() directly skips MFA entirely.
 *
 * For role-gating UI: read profile.role from the profiles table (authoritative)
 * rather than user_metadata (can be stale; set at signup and not updated on
 * role changes made server-side).
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await signOutAndRevoke();
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
}

export default useAuth;
