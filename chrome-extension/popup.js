import env from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const loginForm = document.getElementById('loginForm');
    const loginContainer = document.getElementById('loginContainer');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const authErrorDiv = document.getElementById('authError');
    const fillButton = document.getElementById('fillButton');
    const mainContent = document.getElementById('mainContent');
    const statusMessage = document.getElementById('statusMessage');
    const userEmailSpan = document.getElementById('userEmail');
    const userNameSpan = document.getElementById('userName');
    const profileButton = document.getElementById('profileButton');
    const signOutButton = document.getElementById('signOutButton');

    // Add click event listener to sign out button
    if (signOutButton) {
        signOutButton.addEventListener('click', async function() {
            try {
                // Send sign out request to service worker
                const response = await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
                
                if (response.success) {
                    console.log("User signed out successfully");
                    // Refresh popup data to show login form
                    refreshPopupData();
                } else {
                    console.error("Failed to sign out:", response.error);
                }
            } catch (error) {
                console.error("Error signing out:", error);
            }
        });
    }

    // Add click event listener to profile button
    if (profileButton) {
        profileButton.addEventListener('click', async function() {
            try {
                // Get the session token from the service worker
                const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION_TOKEN' });
                
                if (response.success && response.token) {
                    console.log("Retrieved session token for website auth");
                    
                    // Construct URL to the token login endpoint
                    const baseUrl = env.baseUrl; // Get the base URL from config
                    const loginUrl = `${baseUrl}/auth/token-login?token=${encodeURIComponent(response.token)}&redirectTo=${encodeURIComponent('/application')}`;
                    
                    // Open the token login URL which will set the session and redirect to the application page
                    chrome.tabs.create({ url: loginUrl });
                } else {
                    console.error("Failed to get session token:", response.error);
                    // Fall back to regular URL if we can't get the token
                    chrome.tabs.create({ url: env.applicationUrl });
                }
            } catch (error) {
                console.error("Error getting session token:", error);
                // Fall back to regular URL on error
                chrome.tabs.create({ url: env.applicationUrl });
            }
        });
    }
    
    // Handle form submission for email/password login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showAuthError('Please enter both email and password');
                return;
            }
            
            try {
                // Send login request to service worker
                const response = await chrome.runtime.sendMessage({ 
                    type: 'LOGIN_WITH_CREDENTIALS', 
                    email, 
                    password 
                });
                
                if (response.error) {
                    showAuthError(response.error);
                } else {
                    // Login successful, refresh popup data
                    hideAuthError();
                    refreshPopupData();
                }
            } catch (error) {
                showAuthError('Login failed. Please try again.');
                console.error('Login error:', error);
            }
        });
    }
    
    // Handle Google login button click
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async function() {
            try {
                // Request Google login from service worker
                const response = await chrome.runtime.sendMessage({ 
                    type: 'LOGIN_WITH_GOOGLE'
                });
                
                if (response.error) {
                    showAuthError(response.error);
                } else if (response.authUrl) {
                    // Open the Google auth URL in a new tab
                    chrome.tabs.create({ url: response.authUrl });
                }
            } catch (error) {
                showAuthError('Google login failed. Please try again.');
                console.error('Google login error:', error);
            }
        });
    }
    
    // Add click event listener to fill button
    if (fillButton) {
        fillButton.addEventListener('click', function() {
            // Send message to content script to fill the form
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'START_FILLING' });
            });
        });
    }
    
    // Helper functions for auth errors
    function showAuthError(message) {
        if (authErrorDiv) {
            authErrorDiv.textContent = message;
            authErrorDiv.style.display = 'block';
        }
    }
    
    function hideAuthError() {
        if (authErrorDiv) {
            authErrorDiv.style.display = 'none';
        }
    }
    
    // Function to refresh popup data
    function refreshPopupData() {
        chrome.runtime.sendMessage({ type: 'GET_POPUP_DATA' }, function(response) {
            if (response && response.loggedIn) {
                // User is logged in, display profile info
                displayUserInfo(response.profile, response.email);
                
                // Update status message
                if (statusMessage) {
                    if (response.isJobPage) {
                        statusMessage.textContent = "This appears to be a job application page.";
                        statusMessage.className = "status-message job-page";
                        if (fillButton) fillButton.disabled = false;
                    } else {
                        statusMessage.textContent = "This doesn't appear to be a job application page.";
                        statusMessage.className = "status-message not-job-page";
                        if (fillButton) fillButton.disabled = true;
                    }
                }
            } else {
                // User is not logged in, show login form
                displayUserInfo(null, null);
            }
        });
    }
    
    // Initial refresh on popup load
    refreshPopupData();
});

// Display user profile info when it's available
function displayUserInfo(profile, email) {
  const userEmailSpan = document.getElementById('userEmail');
  const userNameSpan = document.getElementById('userName');
  const loginContainer = document.getElementById('loginContainer');
  const mainContent = document.getElementById('mainContent');
  
  // If no profile or email, show only login form
  if (!profile || !email) {
    if (loginContainer) loginContainer.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
    return;
  }
  
  // User is logged in, show main content and hide login form
  if (loginContainer) loginContainer.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  
  if (userEmailSpan) {
    userEmailSpan.textContent = email || 'Email not available';
  }
  
  if (userNameSpan) {
    try {
      // Use careful property access to avoid errors if properties don't exist
      const firstName = profile && 'first_name' in profile ? profile.first_name : '';
      const lastName = profile && 'last_name' in profile ? profile.last_name : '';
      
      // Safely combine the name parts
      const displayName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : firstName || lastName || 'Name not available';
        
      userNameSpan.textContent = displayName;
      
      // Check if essential profile information is missing
      const missingInfo = checkProfileCompleteness(profile);
      
      // Display warning if needed
      if (missingInfo) {
        // Create or get the warning element
        let warningElement = document.getElementById('profile-warning');
        if (!warningElement) {
          warningElement = document.createElement('div');
          warningElement.id = 'profile-warning';
          warningElement.style.color = '#e74c3c';
          warningElement.style.fontSize = '12px';
          warningElement.style.marginTop = '3px';
          warningElement.style.display = 'block';
          userNameSpan.parentNode.appendChild(warningElement);
        }
        
        // Add warning text and update link
        warningElement.innerHTML = `
          <p style="margin: 0 0 4px 0">${missingInfo}</p>
          <a href="#" id="update-profile-link" style="color: #3498db; text-decoration: underline; font-size: 11px;">
            Click here to update your profile
          </a>
        `;
        
        // Add click event for the update profile link
        setTimeout(() => {
          const updateLink = document.getElementById('update-profile-link');
          if (updateLink) {
            updateLink.addEventListener('click', (e) => {
              e.preventDefault();
              // Open application page in new tab using config
              chrome.tabs.create({ url: env.applicationUrl });
            });
          }
        }, 0);
      }
      
    } catch (error) {
      console.error('Error accessing profile properties:', error);
      userNameSpan.textContent = 'Error displaying name';
    }
  }
}

// Check if essential profile information is present
function checkProfileCompleteness(profile) {
  // Helper function to safely check if a profile field exists and is not empty
  const isFieldMissing = (field) => {
    try {
      return !profile[field] || typeof profile[field] !== 'string' || profile[field].trim() === '';
    } catch (e) {
      return true; // Consider field missing if error occurs
    }
  };

  if (!profile) return 'Profile information missing. Please update your profile.';
  
  const missingFields = [];
  
  // Check essential fields
  if (isFieldMissing('first_name')) {
    missingFields.push('first name');
  }
  
  if (isFieldMissing('last_name')) {
    missingFields.push('last name');
  }
  
  if (isFieldMissing('phone')) {
    missingFields.push('phone number');
  }
  
  // Check address fields - at least city and state/province should be present
  const addressFieldsMissing = [];
  if (isFieldMissing('street_address')) {
    addressFieldsMissing.push('street address');
  }
  
  if (isFieldMissing('city')) {
    addressFieldsMissing.push('city');
  }
  
  if (isFieldMissing('state_province')) {
    addressFieldsMissing.push('state/province');
  }
  
  if (addressFieldsMissing.length > 0) {
    missingFields.push('address information');
  }
  
  if (missingFields.length === 0) {
    return null; // No warning needed
  }
  
  // Format warning message
  if (missingFields.length === 1) {
    return `Your profile is missing ${missingFields[0]}. Please update your profile.`;
  } else {
    const lastField = missingFields.pop();
    return `Your profile is missing ${missingFields.join(', ')} and ${lastField}. Please update your profile.`;
  }
} 