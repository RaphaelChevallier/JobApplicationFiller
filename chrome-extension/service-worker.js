import { createClient } from '@supabase/supabase-js'
import { chromeStorageAdapter } from './storage-adapter' // Import the custom adapter
import env from './config.js'; // Import config
import { saveJobApplication, saveApplicationContent } from './types.js'; // Import job application type and save functions

console.log("Job Application Filler: Service Worker loaded.");

// Use Supabase credentials from config
const SUPABASE_URL = env.supabaseUrl;
const SUPABASE_ANON_KEY = env.supabaseAnonKey;

// Use login URL from config
const LOGIN_URL = env.loginUrl;

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
    if (!supabase) {
        console.error("Supabase client not initialized, cannot update user preferences");
        return;
    }
    
    try {
        // Fetch profile using ID as key (not user_id)
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)  // Use 'id' NOT 'user_id' - id is the primary key in the profiles table
            .single();
        
        if (error) {
            console.error("Error fetching profile:", error.message);
            return;
        }
        
        // Always set a default value of true, regardless of if profile exists or has the column
        let showPopup = true;
        
        // Store show_popup preference only if profile exists
        if (profile) {
            try {
                // Use a safety check that specifically handles if the column doesn't exist
                if ('show_popup' in profile) {
                    showPopup = profile.show_popup ?? true;
                } else {
                    console.log("Column 'show_popup' not found in profile, using default value");
                }
            } catch (columnError) {
                console.error("Error accessing column:", columnError);
                // Continue with default value
            }
            
            console.log("Setting popup preference:", showPopup);
        } else {
            console.log("No profile found for user:", userId);
        }
        
        // Set the value in storage
        await chrome.storage.local.set({
            [SHOW_POPUP_SETTING_KEY]: showPopup
        });
    } catch (e) {
        console.error("Error in updateUserPreferenceStorage:", e);
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
  } else if (message.type === 'GET_PROFILE_DATA') {
    handleGetProfileData(sender, sendResponse);
    return true; // Indicate asynchronous response
  } else if (message.type === 'GET_SESSION_TOKEN') {
    handleGetSessionToken(sendResponse);
    return true; // Indicate asynchronous response
  } else if (message.type === 'LOGIN_WITH_CREDENTIALS') {
    handleCredentialLogin(message, sendResponse);
    return true; // Indicate asynchronous response
  } else if (message.type === 'LOGIN_WITH_GOOGLE') {
    handleGoogleLogin(sendResponse);
    return true; // Indicate asynchronous response
  } else if (message.type === 'SIGN_OUT') {
    handleSignOut(sendResponse);
    return true; // Indicate asynchronous response
  } else if (message.type === 'START_FILLING') {
      const tabId = sender.tab?.id;
      console.log(`Received START_FILLING request from tab ${tabId}.`);
      if (tabId) {
          // Forward the message to the content script in the tab
          chrome.tabs.sendMessage(tabId, { type: 'START_FILLING' }, (response) => {
              if (chrome.runtime.lastError) {
                  console.error(`Error sending START_FILLING to tab ${tabId}:`, chrome.runtime.lastError.message);
                  sendResponse({success: false, error: chrome.runtime.lastError.message});
              } else {
                  console.log(`START_FILLING response from tab ${tabId}:`, response);
                  sendResponse({success: true, ...response});
              }
          });
          return true; // Keep message channel open for async response
      } else {
          console.warn("Received START_FILLING without tab ID.");
          sendResponse({success: false, error: "Missing tab ID"});
      }
  } else if (message.type === 'OPEN_POPUP_FOR_LOGIN') {
      // Open the extension popup UI for login
      console.log("Opening extension popup for login");
      if (sender.tab?.id) {
          try {
              // Open the popup UI programmatically
              chrome.action.openPopup();
              sendResponse({ success: true });
          } catch (error) {
              console.error("Error opening popup:", error);
              // If we can't open the popup directly, we can try to show an icon hint instead
              chrome.action.setPopup({ tabId: sender.tab.id, popup: "popup.html" });
              // Add a badge to draw attention
              chrome.action.setBadgeText({ tabId: sender.tab.id, text: "Login" });
              chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#FF0000" });
              sendResponse({ success: false, error: "Could not open popup directly. Please click the extension icon to login." });
          }
      } else {
          sendResponse({ success: false, error: "No tab information" });
      }
      return true;
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
  } else if (message.type === 'CHECK_JOB_PAGE') {
    checkJobPage(message, sender, sendResponse);
  } else if (message.type === 'SAVE_JOB_APPLICATION') {
    handleSaveJobApplication(message, sender, sendResponse);
    return true; // Indicate asynchronous response
  } else {
     console.log("Unknown internal message type:", message.type);
     sendResponse({ success: false, error: "Unknown message type" }); // Good practice to respond
  }
});

// Handler for email/password login
async function handleCredentialLogin(message, sendResponse) {
    if (!supabase) {
        sendResponse({ error: "Supabase client not initialized" });
        return;
    }

    const { email, password } = message;
    
    if (!email || !password) {
        sendResponse({ error: "Email and password are required" });
        return;
    }
    
    try {
        console.log(`Attempting login with email: ${email}`);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            console.error("Login error:", error);
            sendResponse({ error: error.message });
            return;
        }
        
        if (data?.user) {
            console.log("Login successful for user:", data.user.id);
            
            // Update user preferences after successful login
            await updateUserPreferenceStorage(data.user.id);
            
            sendResponse({ success: true });
        } else {
            sendResponse({ error: "Login failed" });
        }
    } catch (e) {
        console.error("Exception during login:", e);
        sendResponse({ error: "An unexpected error occurred" });
    }
}

// Handler for Google OAuth login
async function handleGoogleLogin(sendResponse) {
    if (!supabase) {
        sendResponse({ error: "Supabase client not initialized" });
        return;
    }
    
    try {
        console.log("Initiating Google OAuth flow");
        
        // Generate the OAuth URL but don't redirect automatically
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: chrome.identity.getRedirectURL()
            }
        });
        
        if (error) {
            console.error("Google OAuth error:", error);
            sendResponse({ error: error.message });
            return;
        }
        
        if (data?.url) {
            console.log("Google auth URL generated:", data.url);
            sendResponse({ authUrl: data.url });
        } else {
            sendResponse({ error: "Failed to generate authentication URL" });
        }
    } catch (e) {
        console.error("Exception during Google login:", e);
        sendResponse({ error: "An unexpected error occurred" });
    }
}

// Handler for sign out
async function handleSignOut(sendResponse) {
    if (!supabase) {
        console.error("Supabase not initialized, cannot sign out.");
        sendResponse({ success: false, error: "Supabase not ready" });
        return;
    }
    
    try {
        console.log("Signing user out...");
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Error signing out:", error);
            sendResponse({ success: false, error: error.message });
            return;
        }
        
        console.log("User signed out successfully");
        
        // Clear any user-specific data in storage
        try {
            await chrome.storage.local.remove(SHOW_POPUP_SETTING_KEY);
            console.log("Cleared user preferences from storage");
        } catch (storageError) {
            console.warn("Failed to clear user preferences:", storageError);
            // Non-critical error, continue with sign out
        }
        
        sendResponse({ success: true });
    } catch (error) {
        console.error("Exception during sign out:", error);
        sendResponse({ 
            success: false, 
            error: "Error signing out: " + error.message
        });
    }
}

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
                    .eq('id', session.user.id) // Changed from user_id to id to match new structure
                    .single(); // Assumes one profile per user ID

                if (profileError) {
                    console.error("Error fetching profile for popup:", profileError);
                    // Profile fetch failed, but user is logged in
                    profileData = null; 
                } else if (profile) {
                    console.log("Profile fetched for popup:", profile);
                    
                    // Make a safe copy of the profile with only the fields we need
                    // This prevents errors from trying to access non-existent columns
                    profileData = {
                        id: profile.id,
                        first_name: profile.first_name || '',
                        last_name: profile.last_name || '',
                        email: session.user.email // Add email from session
                    };
                    
                    // Only add other fields if they exist
                    const optionalFields = [
                        'phone', 'street_address', 'address_line_2', 'city', 
                        'state_province', 'zip_postal_code', 'country'
                    ];
                    
                    for (const field of optionalFields) {
                        if (field in profile) {
                            profileData[field] = profile[field];
                        }
                    }
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

// Handler for GET_PROFILE_DATA requests
async function handleGetProfileData(sender, sendResponse) {
    if (!supabase) {
        console.error("Supabase not initialized, cannot get profile data.");
        sendResponse({ success: false, error: "Supabase not ready" });
        return;
    }
    
    try {
        console.log("Getting session for profile data...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error getting session for profile data:", sessionError);
            sendResponse({ success: false, error: "Session error" });
            return;
        }

        if (!session) {
            console.log("User not logged in, cannot fetch profile data.");
            sendResponse({ success: false, error: "Not logged in" });
            return;
        }
        
        console.log("User logged in. Fetching profile data...");
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*') // Get all profile fields
            .eq('id', session.user.id) // Use id instead of user_id
            .single();

        if (profileError) {
            console.error("Error fetching profile data:", profileError);
            sendResponse({ success: false, error: profileError.message });
            return;
        }
        
        // Make a safe copy of the profile to avoid potential issues with missing columns
        const safeProfile = { ...profile };
        
        // Add email from session to profile data
        safeProfile.email = session.user.email;
        
        console.log("Profile data fetched successfully:", safeProfile);
        sendResponse({ 
            success: true, 
            profile: safeProfile
        });
    } catch (error) {
        console.error("Exception getting profile data:", error);
        sendResponse({ 
            success: false, 
            error: "Error fetching profile data: " + error.message
        });
    }
}

// Handler to get the current session token
async function handleGetSessionToken(sendResponse) {
    if (!supabase) {
        console.error("Supabase not initialized, cannot get session token.");
        sendResponse({ success: false, error: "Supabase not ready" });
        return;
    }
    
    try {
        console.log("Getting session token...");
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error("Error getting session:", error);
            sendResponse({ success: false, error: error.message });
            return;
        }

        if (!session) {
            console.log("No active session found.");
            sendResponse({ success: false, error: "No active session" });
            return;
        }
        
        // Extract the token from the session
        const token = session.access_token;
        console.log("Successfully retrieved session token");
        
        sendResponse({ 
            success: true, 
            token: token
        });
    } catch (error) {
        console.error("Exception getting session token:", error);
        sendResponse({ 
            success: false, 
            error: "Error getting session token: " + error.message
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

// Handler for saving job applications
async function handleSaveJobApplication(message, sender, sendResponse) {
  if (!supabase) {
    sendResponse({ success: false, error: "Supabase client not initialized" });
    return;
  }

  try {
    const { jobApplication, applicationContent } = message;
    
    if (!jobApplication || !jobApplication.job_url) {
      sendResponse({ success: false, error: "Invalid job application data" });
      return;
    }

    // Get the tab URL if job_url is not provided
    if (!jobApplication.job_url && sender.tab?.url) {
      jobApplication.job_url = sender.tab.url;
    }
    
    // Extract company name and job title from page title if not provided
    if ((!jobApplication.company_name || !jobApplication.job_title) && sender.tab?.title) {
      const titleParts = sender.tab.title.split(' - ');
      if (titleParts.length >= 2) {
        // Assume format is "Job Title - Company Name"
        if (!jobApplication.job_title) {
          jobApplication.job_title = titleParts[0].trim();
        }
        if (!jobApplication.company_name) {
          jobApplication.company_name = titleParts[1].trim();
        }
      } else if (titleParts.length === 1) {
        // Just use the title as job title
        if (!jobApplication.job_title) {
          jobApplication.job_title = sender.tab.title.trim();
        }
      }
    }

    // Save the job application
    const savedJob = await saveJobApplication(supabase, jobApplication);
    
    // Save application content if provided
    let savedContent = null;
    if (applicationContent && savedJob && savedJob.id) {
      // Save the application content with the job application ID
      savedContent = await saveApplicationContent(supabase, savedJob.id, applicationContent);
    }
    
    sendResponse({ 
      success: true, 
      message: "Job application saved successfully", 
      data: savedJob,
      content: savedContent
    });
  } catch (error) {
    console.error("Error saving job application:", error);
    sendResponse({ 
      success: false, 
      error: "Error saving job application: " + error.message 
    });
  }
} 