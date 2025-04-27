console.log("Job Application Filler: Content script loaded.");

// ID for the notification popup to prevent duplicates
const NOTIFICATION_POPUP_ID = 'job-filler-notification-popup';
const SHOW_POPUP_SETTING_KEY = 'showJobDetectionPopup'; // Same key as in service-worker

// Function to display the detection notification popup
function displayDetectionPopup() {
    // Remove existing popup if any
    const existingPopup = document.getElementById(NOTIFICATION_POPUP_ID);
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup elements
    const popup = document.createElement('div');
    popup.id = NOTIFICATION_POPUP_ID;
    popup.style.position = 'fixed';
    popup.style.bottom = '20px';
    popup.style.right = '20px';
    popup.style.padding = '15px 20px';
    popup.style.backgroundColor = '#f0f0f0'; 
    popup.style.border = '1px solid #ccc';
    popup.style.borderRadius = '8px';
    popup.style.zIndex = '2147483647';
    popup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    popup.style.fontFamily = 'Arial, sans-serif';
    popup.style.fontSize = '14px';
    popup.style.color = '#333';
    popup.style.maxWidth = '300px';
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.5s ease-in-out';

    const message = document.createElement('p');
    message.style.margin = '0 0 10px 0';
    message.textContent = 'Job application detected. Would you like to fill it out?'; // Initial message

    const buttonContainer = document.createElement('div');
    buttonContainer.style.textAlign = 'center'; // Center align buttons by default

    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.style.padding = '8px 15px';
    yesButton.style.backgroundColor = '#4CAF50';
    yesButton.style.color = 'white';
    yesButton.style.border = 'none';
    yesButton.style.borderRadius = '4px';
    yesButton.style.cursor = 'pointer';
    yesButton.style.marginLeft = '10px'; // Keep margin for spacing between buttons
    yesButton.style.fontSize = '14px';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '8px 10px';
    cancelButton.style.backgroundColor = '#f44336';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.fontSize = '12px';
    cancelButton.style.marginRight = '10px'; // Add margin for spacing

    // Append initial elements
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(yesButton);
    popup.appendChild(message);
    popup.appendChild(buttonContainer);
    document.body.appendChild(popup);

    // Fade in
    setTimeout(() => { popup.style.opacity = '1'; }, 10);

    // Initial Timeout (will be cleared if 'Yes' is clicked)
    let timeoutId = setTimeout(() => {
        if (popup && popup.parentNode) { // Check if still attached
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 500);
        }
    }, 5000); // 5 seconds

    // Function to remove the popup cleanly
    const removePopup = () => {
        clearTimeout(timeoutId); // Clear any pending timeout
        if (popup && popup.parentNode) {
            popup.style.opacity = '0';
            setTimeout(() => popup.remove(), 500);
        }
    };

    // Event listeners
    yesButton.addEventListener('click', () => {
        console.log('User clicked Yes on detection popup. Checking auth status...');
        clearTimeout(timeoutId); // Clear the initial timeout immediately

        chrome.runtime.sendMessage({ type: 'CHECK_AUTH_STATUS' }, (response) => {
            if (!popup || !popup.parentNode) return; 

            if (chrome.runtime.lastError) {
                console.error('Error checking auth status:', chrome.runtime.lastError.message);
                message.textContent = 'Error checking status. Please try again later.'; // Update message
                buttonContainer.innerHTML = ''; // Remove buttons
                timeoutId = setTimeout(removePopup, 3000); // Auto-close after error message
            } else if (response && response.loggedIn) {
                console.log('User is logged in. Sending START_FILLING message.');
                chrome.runtime.sendMessage({ type: 'START_FILLING' }, (fillResponse) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending START_FILLING message:', chrome.runtime.lastError.message);
                    } else {
                        console.log('START_FILLING response:', fillResponse);
                        // Maybe display a success/failure message based on fillResponse?
                    }
                });
                removePopup(); // Remove popup after sending fill command
            } else {
                console.log('User is not logged in. Modifying popup to prompt login with Sign In and Cancel.');
                message.textContent = 'Please sign in to fill automatically.';
                
                // Create Sign In and Cancel buttons
                const loginButton = document.createElement('button');
                loginButton.textContent = 'Sign In';
                loginButton.style.padding = '8px 15px';
                loginButton.style.backgroundColor = '#007bff';
                loginButton.style.color = 'white';
                loginButton.style.border = 'none';
                loginButton.style.borderRadius = '4px';
                loginButton.style.cursor = 'pointer';
                loginButton.style.fontSize = '14px';
                loginButton.style.marginLeft = '10px';

                const cancelButton_loggedOut = document.createElement('button');
                cancelButton_loggedOut.textContent = 'Cancel';
                cancelButton_loggedOut.style.padding = '8px 10px';
                cancelButton_loggedOut.style.backgroundColor = '#f44336';
                cancelButton_loggedOut.style.color = 'white';
                cancelButton_loggedOut.style.border = 'none';
                cancelButton_loggedOut.style.borderRadius = '4px';
                cancelButton_loggedOut.style.cursor = 'pointer';
                cancelButton_loggedOut.style.fontSize = '12px';
                cancelButton_loggedOut.style.marginRight = '10px'; // Add margin for spacing

                // Add click listeners
                loginButton.addEventListener('click', () => {
                    console.log('Login button clicked. Sending INITIATE_LOGIN.');
                    chrome.runtime.sendMessage({ type: 'INITIATE_LOGIN' }, (loginResponse) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error sending INITIATE_LOGIN message:', chrome.runtime.lastError.message);
                        } else {
                            console.log('INITIATE_LOGIN response:', loginResponse); 
                        }
                    });
                    removePopup(); // Remove popup after initiating login
                });

                cancelButton_loggedOut.addEventListener('click', () => {
                    console.log('Logged-out Cancel button clicked.');
                    removePopup();
                });

                // Replace existing buttons
                buttonContainer.innerHTML = '';
                buttonContainer.style.textAlign = 'center'; // Ensure alignment is center
                buttonContainer.appendChild(cancelButton_loggedOut);
                buttonContainer.appendChild(loginButton);

                // Optional: Reset timeout or let it persist
            }
        });
    });

    cancelButton.addEventListener('click', () => {
        console.log('User clicked Cancel on detection popup.');
        removePopup();
    });
}

// Function to check if the current page is a job application page using scoring
async function checkJobApplicationPage() {
    console.log("Job Application Filler: Running enhanced page check...");
    let score = 0;
    const detectionDetails = []; // Store reasons for score increases

    // --- Keywords and Scores --- 
    const keywords = {
        url: { points: 8, list: ['careers', 'jobs', 'apply', 'positions', 'hiring', 'vacancies', 'lever.co', 'greenhouse.io', 'workday', 'recruitment', 'job-opening', 'job_opening'] },
        title: { points: 4, list: ['apply', 'job', 'career', 'position', 'hiring', 'vacancy', 'recruiting'] },
        formInput: { points: 1, list: ['resume', 'cover_letter', 'cover letter', 'first_name', 'last_name', 'email', 'phone', 'linkedin', 'portfolio', 'salary', 'upload cv', 'upload resume', 'submit application', 'references', 'full name'] },
        heading: { points: 2, list: ['apply now', 'job description', 'submit application', 'your details', 'personal information', 'work experience', 'education', 'application form', 'candidate profile', 'equal opportunity'] },
        pageText: { points: 0.5, list: ['submit application', 'equal opportunity employer', 'eoe', 'diversity and inclusion', 'required qualifications', 'preferred qualifications', 'responsibilities', 'benefits', 'location', 'department', 'employment type', 'job id', 'position available'] }
    };
    const SCORE_THRESHOLD = 5; // Reduced from 8 to make detection more lenient

    // --- Checks --- 

    // 1. Check URL
    const currentUrl = window.location.href.toLowerCase();
    keywords.url.list.forEach(keyword => {
        if (currentUrl.includes(keyword)) {
            console.log(` +${keywords.url.points} score from URL keyword: ${keyword}`);
            score += keywords.url.points;
            detectionDetails.push(`URL ('${keyword}')`);
        }
    });

    // 2. Check Title
    const pageTitle = document.title.toLowerCase();
    keywords.title.list.forEach(keyword => {
        if (pageTitle.includes(keyword)) {
            console.log(` +${keywords.title.points} score from Title keyword: ${keyword}`);
            score += keywords.title.points;
            detectionDetails.push(`Title ('${keyword}')`);
        }
    });

    // 3. Check Form Inputs (Labels, Placeholders, Names, IDs)
    const inputs = document.querySelectorAll('input, textarea, select');
    let uniqueFormMatches = new Set();
    inputs.forEach(input => {
        const name = input.getAttribute('name')?.toLowerCase() || '';
        const id = input.getAttribute('id')?.toLowerCase() || '';
        const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';
        const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
        const labelText = input.labels ? Array.from(input.labels).map(l => l.textContent.toLowerCase()).join(' ') : '';
        const combinedText = `${name} ${id} ${placeholder} ${ariaLabel} ${labelText}`;
        
        keywords.formInput.list.forEach(keyword => {
             if (combinedText.includes(keyword) && !uniqueFormMatches.has(keyword)) {
                console.log(` +${keywords.formInput.points} score from Form Input keyword: ${keyword}`);
                score += keywords.formInput.points;
                uniqueFormMatches.add(keyword); // Count each keyword only once per page
                detectionDetails.push(`Input ('${keyword}')`);
            }
        });
    });

    // 4. Check Headings (h1-h6)
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let uniqueHeadingMatches = new Set();
    headings.forEach(heading => {
        const headingText = heading.textContent.toLowerCase();
        keywords.heading.list.forEach(keyword => {
            if (headingText.includes(keyword) && !uniqueHeadingMatches.has(keyword)) {
                console.log(` +${keywords.heading.points} score from Heading keyword: ${keyword}`);
                score += keywords.heading.points;
                uniqueHeadingMatches.add(keyword);
                detectionDetails.push(`Heading ('${keyword}')`);
            }
        });
    });

    // 5. Check Page Text (limited scope for performance)
    const textElements = document.querySelectorAll('p, li, dt, dd, span'); // Check common text containers
    let uniqueTextMatches = new Set();
    let textMatchCount = 0;
    const MAX_TEXT_MATCHES = 10; // Limit how many text matches can contribute to score
    textElements.forEach(el => {
        if (textMatchCount >= MAX_TEXT_MATCHES) return; // Stop checking if limit reached
        const elementText = el.textContent.toLowerCase();
         // Basic check to avoid huge elements, might need refinement
        if (elementText.length > 5 && elementText.length < 500) { 
            keywords.pageText.list.forEach(keyword => {
                if (elementText.includes(keyword) && !uniqueTextMatches.has(keyword)) {
                    console.log(` +${keywords.pageText.points} score from Page Text keyword: ${keyword}`);
                    score += keywords.pageText.points;
                    uniqueTextMatches.add(keyword);
                    textMatchCount++;
                    detectionDetails.push(`Text ('${keyword}')`);
                    if (textMatchCount >= MAX_TEXT_MATCHES) return; 
                }
            });
        }
    });

    // --- Determine Result --- 
    const isJobPage = score >= SCORE_THRESHOLD;
    const method = isJobPage ? `Score (${score.toFixed(1)} >= ${SCORE_THRESHOLD})` : `Score (${score.toFixed(1)} < ${SCORE_THRESHOLD})`;

    console.log(`Job Application Filler: Final Score = ${score.toFixed(1)}. Threshold = ${SCORE_THRESHOLD}. Is Job Page = ${isJobPage}`);
    if (isJobPage) {
        console.log("Contributing factors:", detectionDetails.join(', '));
    }

    return { isJobPage: isJobPage, method: method };
}

// Check and send message with detection details
(async () => { 
    try {
        const detectionResult = await checkJobApplicationPage(); 
        console.log(`Job Application Filler: Final Detection Result:`, detectionResult);

        // Send message to service worker 
        chrome.runtime.sendMessage({ 
            type: 'PAGE_CHECK_RESULT', 
            isJobPage: detectionResult.isJobPage,
            detectionMethod: detectionResult.method // Send the score-based method
        }, (response) => {
            if (chrome.runtime.lastError) {
                // console.warn("Could not send PAGE_CHECK_RESULT:", chrome.runtime.lastError.message);
            }
        }); 

        // Display popup if it's a job page
        if (detectionResult.isJobPage) {
            console.log("Job page detected via scoring, displaying notification popup.");
            displayDetectionPopup();
        }
        
    } catch (error) {
        console.error("Error during enhanced job page check or popup display:", error);
    }
})(); 