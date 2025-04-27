document.addEventListener('DOMContentLoaded', () => {
    const loadingDiv = document.getElementById('loading');
    const statusDiv = document.getElementById('status');
    const profileInfoDiv = document.getElementById('profileInfo');
    const actionsDiv = document.getElementById('actions');
    const authStatusSpan = document.getElementById('authStatus');
    const jobPageStatusP = document.getElementById('jobPageStatus');
    const userEmailSpan = document.getElementById('userEmail');
    const userNameSpan = document.getElementById('userName');
    const loginButton = document.getElementById('loginButton');
    const fillButton = document.getElementById('fillButton');

    // Request initial data from the service worker
    chrome.runtime.sendMessage({ type: 'GET_POPUP_DATA' }, (response) => {
        loadingDiv.style.display = 'none'; // Hide loading
        statusDiv.style.display = 'block';
        actionsDiv.style.display = 'block';
        
        console.log("Popup received data:", response);

        if (chrome.runtime.lastError) {
            console.error("Error receiving popup data:", chrome.runtime.lastError.message);
            authStatusSpan.textContent = 'Error loading data';
            authStatusSpan.className = 'error';
            return;
        }
        
        if (!response) {
             console.error("No response received from service worker.");
             authStatusSpan.textContent = 'Error: No response';
             authStatusSpan.className = 'error';
             return;
        }

        // Update Job Page Status Display
        if (response.isJobPage) {
            jobPageStatusP.textContent = 'Job Application page detected!';
            jobPageStatusP.className = 'job-page-notice';
        } else {
             jobPageStatusP.textContent = 'Not on a job application page.';
             jobPageStatusP.className = '';
        }

        // Update UI based on login status
        if (response.loggedIn) {
            authStatusSpan.textContent = 'Logged In';
            authStatusSpan.className = '';
            loginButton.textContent = 'Refresh Status'; // Or potentially a Logout button
            
            if (response.profile) {
                 profileInfoDiv.style.display = 'block';
                 userEmailSpan.textContent = response.email || 'N/A';
                 userNameSpan.textContent = response.profile.full_name || 'Not set';
                 // Enable fill button only if logged in, profile exists, and on a job page
                 fillButton.disabled = !response.isJobPage;
            } else {
                 profileInfoDiv.style.display = 'block';
                 userEmailSpan.textContent = response.email || 'N/A';
                 userNameSpan.textContent = 'Profile not set up yet';
                 fillButton.disabled = true; // Can't fill without profile
            }
            // Always show both buttons when logged in
            loginButton.style.display = 'block';
            fillButton.style.display = 'block';
        } else {
            authStatusSpan.textContent = 'Logged Out';
            authStatusSpan.className = 'error';
            profileInfoDiv.style.display = 'none';
            
            if (response.isJobPage) {
                // Special case: Not logged in but on a job page - show single combined button
                loginButton.textContent = 'Log in to fill application';
                loginButton.className = 'login';
                loginButton.style.display = 'block';
                // Hide the fill button in this case
                fillButton.style.display = 'none';
            } else {
                // Not on a job page, just show normal login button
                loginButton.textContent = 'Login';
                loginButton.className = 'login';
                loginButton.style.display = 'block';
                // Show disabled fill button
                fillButton.style.display = 'block';
                fillButton.disabled = true;
            }
        }
    });

    // Add event listeners for buttons
    loginButton.addEventListener('click', () => {
        const currentStatus = authStatusSpan.textContent;
        if (currentStatus === 'Logged Out' || currentStatus.startsWith('Error')) {
            // Send message to service worker to initiate login
            chrome.runtime.sendMessage({ type: 'INITIATE_LOGIN' }, (response) => {
                 if (chrome.runtime.lastError) {
                     console.error("Error initiating login:", chrome.runtime.lastError.message);
                 } else if (response?.success) {
                     console.log("Login initiated.");
                     // Maybe close the popup or show a message?
                     window.close(); // Close popup after initiating login
                 } else {
                     console.error("Failed to initiate login:", response?.error);
                 }
            });
        } else {
            // If logged in, this button acts as a refresh
            window.location.reload();
        }
    });

    fillButton.addEventListener('click', () => {
        if (!fillButton.disabled) {
            console.log("Fill Application button clicked!");
            // TODO: Send message to content script to start filling the form
            // Need to query the active tab to send message to the correct content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'START_FILLING' }, (response) => {
                         if (chrome.runtime.lastError) {
                            console.error("Error sending START_FILLING:", chrome.runtime.lastError.message);
                            alert("Error contacting page script: " + chrome.runtime.lastError.message);
                         } else {
                             console.log("Fill response:", response);
                             // Maybe show status in popup based on response
                             alert(response?.status || "Fill action sent.");
                             window.close();
                         }
                    });
                } else {
                     console.error("Could not get active tab ID to send fill message.");
                     alert("Could not find active tab.");
                }
            });
        }
    });
}); 