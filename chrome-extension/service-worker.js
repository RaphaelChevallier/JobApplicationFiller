import { createClient } from '@supabase/supabase-js'
import { chromeStorageAdapter } from './storage-adapter' // Import the custom adapter

console.log("Job Application Filler: Service Worker loaded.");

// !! IMPORTANT: Use your actual Supabase credentials !!
const SUPABASE_URL = 'https://qculzyrifhqowlmgihqw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdWx6eXJpZmhxb3dsbWdpaHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2OTAxMTYsImV4cCI6MjA2MTI2NjExNn0.nyNnMX8YslNB2EUFK9GrNiSDHr2l76lS2RQu0RpD11k';

const LOGIN_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/login' 
    : 'YOUR_PRODUCTION_WEBSITE_URL/login'; // <-- REPLACE with production URL later

// Track job page status per tab
const tabJobPageStatus = {};
// Key for storing the setting
const SHOW_POPUP_SETTING_KEY = 'showJobDetectionPopup'; 

// Initialize Supabase client
let supabase = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  console.log("Supabase client initialized with custom adapter.");
} catch (error) {
  console.error("Error initializing Supabase client:", error);
}

// --- Helper Function --- 

// Function to update the action badge AND icon
function updateActionState(tabId, isJobPage) {
    if (!tabId) return; // Need a tab ID
    try {
        const badgeText = isJobPage ? "Fill" : ""; // Changed text
        const badgeColor = "#008000"; // Keep it green for visibility
        
        // Define icon paths based on state
        const iconPaths = isJobPage ? {
            "16": "images/icon-16-active.png",
            "32": "images/icon-32-active.png",
            "48": "images/icon-48-active.png",
            "128": "images/icon-128-active.png"
        } : {
            "16": "images/icon-16.png", // Default icons
            "32": "images/icon-32.png",
            "48": "images/icon-48.png",
            "128": "images/icon-128.png"
        };

        // Set Icon
        chrome.action.setIcon({ tabId: tabId, path: iconPaths });
        console.log(`Action icon updated for tab ${tabId} to ${isJobPage ? 'active' : 'default'}`);

        // Set Badge Text
        chrome.action.setBadgeText({ tabId: tabId, text: badgeText });
        console.log(`Action badge text updated for tab ${tabId}: '${badgeText}'`);

        // Set Badge Color (only really visible when text is set)
        if (badgeText) {
            chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: badgeColor });
            console.log(`Action badge color updated for tab ${tabId}: '${badgeColor}'`);
        }

    } catch (error) {
        console.warn(`Failed to update action state for tab ${tabId}:`, error.message);
    }
}

// Function to fetch profile and store popup setting
async function updateUserPreferenceStorage(userId) {
    if (!supabase || !userId) {
        // Clear setting if no user or supabase client
        await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY);
        console.log("Cleared popup preference from storage (no user/client).");
        return;
    }
    try {
        console.log(`Fetching profile for user ${userId} to store popup preference...`);
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('show_detection_popup') // Only select the needed field
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle to handle no profile case gracefully

        if (profileError) {
            console.error("Error fetching profile for preference storage:", profileError);
            await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY); // Clear on error
            console.log("Cleared popup preference from storage (profile fetch error).");
        } else {
            // Store the preference (true if profile exists and is true, false otherwise)
            const shouldShowPopup = !!profile?.show_detection_popup; 
            await chrome.storage.local.set({ [SHOW_POPUP_SETTING_KEY]: shouldShowPopup });
            console.log(`Stored popup preference in storage: ${shouldShowPopup}`);
        }
    } catch(e) {
         console.error("Exception fetching/storing preference:", e);
         await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY);
         console.log("Cleared popup preference from storage (exception).");
    }
}

// --- Message Listeners --- 

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Internal message received:", message, "from tab", sender.tab?.id);

  if (message.type === 'PAGE_CHECK_RESULT') {
    const tabId = sender.tab?.id;
    if (tabId) {
        tabJobPageStatus[tabId] = message.isJobPage;
        console.log(
            `Tab ${tabId} job page status updated: ${message.isJobPage} ` +
            `(Method: ${message.detectionMethod || 'Unknown'})`
        );
        // Update the badge AND icon based on the result for this tab
        updateActionState(tabId, message.isJobPage);
    } else {
        console.warn("Received PAGE_CHECK_RESULT without tab ID.");
    }
  } else if (message.type === 'GET_POPUP_DATA') {
    handleGetPopupData(sender, sendResponse);
    return true; // Indicate asynchronous response
  } else if (message.type === 'INITIATE_LOGIN') {
    console.log("Login initiated.");
    chrome.tabs.create({ url: LOGIN_URL });
    sendResponse({ success: true, message: "Login page opened." }); 
  } else if (message.type === 'START_FILLING') {
      const tabId = sender.tab?.id;
      console.log(`Received START_FILLING request from tab ${tabId}.`);
      if (tabId) {
          // TODO: Implement the actual form filling logic here
          // This might involve sending another message back to the content script
          // or using chrome.scripting.executeScript
          console.log(`Placeholder: Would start filling form on tab ${tabId}`);
          sendResponse({success: true, message: "Filling process initiated (placeholder)."});
      } else {
          console.warn("Received START_FILLING without tab ID.");
          sendResponse({success: false, error: "Missing tab ID"});
      }
  } else if (message.type === 'CHECK_AUTH_STATUS') {
      console.log("Checking authentication status...");
      if (!supabase) {
          console.error("Supabase client not ready for auth check.");
          sendResponse({ loggedIn: false, error: "Supabase not ready" });
          return false; // Synchronous response (error)
      }
      // Asynchronously get the session
      (async () => {
          try {
              const { data: { session }, error } = await supabase.auth.getSession();
              if (error) {
                  console.error("Error checking session:", error);
                  sendResponse({ loggedIn: false, error: error.message });
              } else {
                  const isLoggedIn = !!session;
                  console.log(`Auth status check complete. Logged in: ${isLoggedIn}`);
                  sendResponse({ loggedIn: isLoggedIn });
              }
          } catch (e) {
              console.error("Exception during auth status check:", e);
              sendResponse({ loggedIn: false, error: "Exception during check" });
          }
      })();
      return true; // Indicate asynchronous response is expected
  } else {
     console.log("Unknown internal message type:", message.type);
     sendResponse({ success: false, error: "Unknown message type" }); // Good practice to respond
  }
});

chrome.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
  console.log("External message received from", sender.origin, ":", message);
  if (message.type === 'SESSION_DATA' && message.payload) {
    console.log("Received session data from website.");
    if (supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.setSession(message.payload);
        if (error) {
          console.error("Error setting session:", error);
          await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY); // Clear pref on error
          sendResponse({ success: false, error: error.message });
        } else {
          console.log("Session successfully set in extension.");
          // Fetch profile and store preference *after* session is set
          if (session?.user?.id) {
             await updateUserPreferenceStorage(session.user.id);
          } else {
              // No user in session, clear storage
              await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY);
              console.log("Cleared popup preference from storage (no user in session).");
          }
          sendResponse({ success: true });
        }
      } catch (e) {
        console.error("Exception setting session:", e);
        await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY); // Clear pref on error
        sendResponse({ success: false, error: 'Exception setting session' });
      }
    } else {
      console.error("Supabase client not ready.");
      sendResponse({ success: false, error: 'Supabase client not ready' });
    }
    return true; // Indicate async response
  }
  // Allow other external messages if needed in the future
  // sendResponse({ success: false, error: 'Unknown external message type' });
});

// --- Core Logic --- 

// Called by popup to get initial state
async function handleGetPopupData(sender, sendResponse) {
    if (!supabase) {
        console.error("Supabase not initialized, cannot get popup data.");
        sendResponse({ loggedIn: false, profile: null, isJobPage: false, error: "Supabase not ready" });
        return;
    }
    
    // Get the active tab ID since popups don't have sender.tab
    try {
        // Query for the active tab in the current window
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        const activeTabId = activeTab?.id;
        
        console.log("Popup data request - Active tab:", activeTabId, "URL:", activeTab?.url);
        
        // Get the stored job page status for the active tab
        const currentJobPageStatus = activeTabId ? (tabJobPageStatus[activeTabId] || false) : false;
        console.log(`Retrieved job page status for active tab ${activeTabId}: ${currentJobPageStatus}`);

        console.log("Getting session for popup...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error getting session for popup:", sessionError);
            // Send back the retrieved status even if there's a session error
            sendResponse({ loggedIn: false, profile: null, isJobPage: currentJobPageStatus, error: "Session error" });
            return;
        }

        let profileData = null;
        let loggedIn = !!session;
        let userEmail = session?.user?.email || null;

        if (session) {
            console.log("User logged in (for popup). Fetching profile...");
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*') // Select all for popup display
                    .eq('user_id', session.user.id) // Use 'user_id' from the profile table schema
                    .single(); // Assumes one profile per user ID

                if (profileError) {
                    console.error("Error fetching profile for popup:", profileError);
                    // Profile fetch failed, but user is logged in
                    profileData = null; 
                } else {
                    console.log("Profile fetched for popup:", profile);
                    profileData = profile;
                }
            } catch(e) {
                console.error("Exception fetching profile:", e);
                profileData = null;
            }
        } else {
            console.log("User not logged in (for popup).");
        }

        // For debugging, dump the current tab status map
        console.log("Current tab status map:", JSON.stringify(tabJobPageStatus));

        // Send the complete response
        console.log("Sending data to popup:", { loggedIn, email: userEmail, profile: profileData, isJobPage: currentJobPageStatus });
        sendResponse({ 
            loggedIn: loggedIn, 
            email: userEmail, 
            profile: profileData, 
            isJobPage: currentJobPageStatus // Include the correct status
        });
    } catch (error) {
        console.error("Error getting active tab:", error);
        sendResponse({ 
            loggedIn: false, 
            profile: null, 
            isJobPage: false, 
            error: "Error getting active tab: " + error.message
        });
    }
}

// --- Auth State Change Listener ---
supabase?.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event);
  if (event === 'SIGNED_OUT') {
    console.log('User signed out. Clearing stored preferences.');
    await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY);
    // Optionally clear other user-specific data if needed
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      // Session might be available, re-fetch/update preferences
      if (session?.user?.id) {
          console.log(`Auth event ${event} for user ${session.user.id}. Updating preference storage.`);
          await updateUserPreferenceStorage(session.user.id);
      } else {
          console.log(`Auth event ${event} but no user ID found. Clearing preference storage.`);
          await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY);
      }
  }
});

// --- Startup Logic --- 
supabase?.auth.getSession().then(({ data: {session}}) => {
    console.log(`Service Worker started. ${session ? 'Existing session found.' : 'No session found.'}`);
    // Initial preference load on startup if logged in
    if (session?.user?.id) {
        updateUserPreferenceStorage(session.user.id);
    } else {
        // Ensure cleared storage if starting signed out
         chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY);
    }
});

// Clean up tab status AND badge/icon when a tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    delete tabJobPageStatus[tabId];
    console.log(`Cleaned up status for closed tab ${tabId}`);
    // Attempt to clear badge and reset icon, might fail if window is also closing
    try {
         chrome.action.setBadgeText({ tabId: tabId, text: '' });
         // Reset icon to default when tab is closed (important if it was active)
         chrome.action.setIcon({ 
             tabId: tabId, 
             path: {
                "16": "images/icon-16.png",
                "32": "images/icon-32.png",
                "48": "images/icon-48.png",
                "128": "images/icon-128.png"
            }
         });
    } catch(e) {
        console.warn(`Could not reset action state for closed tab ${tabId}:`, e.message);
    }
}); 