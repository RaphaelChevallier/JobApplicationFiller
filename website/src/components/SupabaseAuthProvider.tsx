'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client' // Use the client-side helper
import type { Session } from '@supabase/supabase-js'

export default function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Website] Auth event:', event);
      // We no longer need to communicate with the extension
      // The extension now handles login directly
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]); // Re-run if supabase client instance changes (though likely won't)

  return <>{children}</>;
} 