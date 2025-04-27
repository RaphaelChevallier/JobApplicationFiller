'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client' // Use the client-side helper
import type { Session } from '@supabase/supabase-js'

// Your Chrome Extension ID
const EXTENSION_ID = 'oeohaakicpbhfakjfgfmnogkhoajgabd';

export default function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Website] Auth event:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('[Website] User signed in, attempting to send session to extension:', EXTENSION_ID);
        if (chrome.runtime && chrome.runtime.sendMessage) {
          const sessionDataToSend = {
             access_token: session.access_token,
             refresh_token: session.refresh_token, // Crucial for the extension to maintain the session
             expires_in: session.expires_in,
             expires_at: session.expires_at,
             token_type: session.token_type,
             // DO NOT send user object directly if it contains sensitive info not needed by extension
          };
          
          chrome.runtime.sendMessage(
            EXTENSION_ID, 
            { type: 'SESSION_DATA', payload: sessionDataToSend },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error('[Website] Error sending session to extension:', chrome.runtime.lastError.message);
                // Handle error - maybe the extension isn't installed or wasn't listening
              } else if (response?.success) {
                 console.log('[Website] Successfully sent session to extension.');
              } else {
                  console.warn('[Website] Extension did not successfully process session:', response?.error);
              }
            }
          );
        } else {
             console.warn('[Website] Cannot send message to extension - chrome.runtime not available or not allowed.');
             // This might happen if the script runs outside the context where the extension can be reached
        }
      }
       // Optional: Handle SIGNED_OUT event to potentially clear session in extension?
       // else if (event === 'SIGNED_OUT') {
       //    chrome.runtime.sendMessage(EXTENSION_ID, { type: 'CLEAR_SESSION' }, ...);
       // }
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]); // Re-run if supabase client instance changes (though likely won't)

  return <>{children}</>;
} 