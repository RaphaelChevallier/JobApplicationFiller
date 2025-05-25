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
                    console.log('Login button clicked. Opening extension popup for login.');
                    // Instead of redirecting to website, open the extension popup for login
                    chrome.runtime.sendMessage({ type: 'OPEN_POPUP_FOR_LOGIN' });
                    removePopup(); // Remove the content popup
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

// Function to check if the current page is a job application page using enhanced scoring
async function checkJobApplicationPage() {
    console.log("Job Application Filler: Running enhanced page check...");
    
    // Early exit for obviously non-job pages
    const currentUrl = window.location.href.toLowerCase();
    const pageTitle = document.title.toLowerCase();
    
    // Quick exclusion patterns - if any of these match, it's definitely not a job application
    const quickExcludePatterns = [
        // Social media and entertainment
        'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'tiktok.com', 'reddit.com',
        // E-commerce and shopping
        'amazon.com', 'ebay.com', 'shopify.com', 'etsy.com', 'walmart.com', 'target.com',
        // News and media
        'cnn.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com', 'reuters.com',
        // Banking and finance (non-career pages)
        'paypal.com', 'stripe.com', 'square.com',
        // Search engines
        'google.com/search', 'bing.com/search', 'duckduckgo.com',
        // File sharing and cloud
        'dropbox.com', 'drive.google.com', 'onedrive.com',
        // Development tools (non-career pages)
        'github.com/repos', 'stackoverflow.com/questions', 'codepen.io/pen'
    ];
    
    const quickExcludeUrlPatterns = [
        '/login', '/signin', '/register', '/signup', '/checkout', '/cart', '/payment',
        '/contact', '/about', '/privacy', '/terms', '/help', '/support', '/faq',
        '/blog/', '/news/', '/article/', '/post/', '/product/', '/item/',
        '/search?', '/results?', '/browse/', '/category/', '/tag/'
    ];
    
    // Check for quick exclusions
    if (quickExcludePatterns.some(pattern => currentUrl.includes(pattern)) ||
        quickExcludeUrlPatterns.some(pattern => currentUrl.includes(pattern))) {
        console.log("Job Application Filler: Quick exclusion - not a job application page");
        return { isJobPage: false, method: "Quick Exclusion" };
    }
    
    // Check if page has minimal content (likely still loading or error page)
    const bodyText = document.body?.textContent?.trim() || '';
    if (bodyText.length < 100) {
        console.log("Job Application Filler: Page has minimal content, skipping detection");
        return { isJobPage: false, method: "Minimal Content" };
    }
    
    let score = 0;
    const detectionDetails = []; // Store reasons for score increases

    // --- Enhanced Keywords and Scores --- 
    const keywords = {
        // High-confidence URL patterns (strong indicators)
        urlStrong: { 
            points: 12, 
            list: [
                'apply', 'application', 'careers/apply', 'jobs/apply', 'positions/apply',
                'lever.co', 'greenhouse.io', 'workday.com', 'bamboohr.com', 'smartrecruiters.com',
                'jobvite.com', 'icims.com', 'taleo.net', 'successfactors.com', 'ultipro.com',
                'myworkdayjobs.com', 'recruiting.ultipro.com', 'recruiting.paylocity.com',
                'applytojob.com', 'careers.', 'jobs.', 'hiring.', 'recruit.'
            ] 
        },
        // Medium-confidence URL patterns
        urlMedium: { 
            points: 6, 
            list: ['careers', 'jobs', 'positions', 'hiring', 'vacancies', 'recruitment', 'job-opening', 'job_opening', 'employment', 'work-with-us', 'join-us'] 
        },
        // Page title indicators (strong)
        title: { 
            points: 8, 
            list: [
                'apply for', 'job application', 'application form', 'apply now', 'submit application',
                'career opportunity', 'position application', 'join our team', 'we\'re hiring',
                'employment application', 'candidate application'
            ] 
        },
        // Page title indicators (medium)
        titleMedium: { 
            points: 4, 
            list: ['apply', 'job', 'career', 'position', 'hiring', 'vacancy', 'recruiting', 'employment', 'opportunity'] 
        },
        // Form input indicators (high confidence)
        formInputStrong: { 
            points: 3, 
            list: [
                'resume', 'cv', 'cover_letter', 'cover letter', 'coverletter', 'upload resume', 'upload cv',
                'submit application', 'apply now', 'application form', 'job application', 'curriculum vitae'
            ] 
        },
        // Form input indicators (medium confidence)
        formInputMedium: { 
            points: 1.5, 
            list: [
                'first_name', 'last_name', 'full_name', 'email', 'phone', 'linkedin', 'portfolio', 
                'salary', 'references', 'work_authorization', 'visa_status', 'start_date', 'availability',
                'desired_salary', 'expected_salary', 'notice_period', 'willing_to_relocate'
            ] 
        },
        // Basic form inputs (lower confidence as they appear on many forms)
        formInputBasic: { 
            points: 0.5, 
            list: ['name', 'address', 'city', 'state', 'zip', 'country', 'gender', 'ethnicity'] 
        },
        // Page headings (strong indicators)
        headingStrong: { 
            points: 5, 
            list: [
                'apply now', 'job application', 'application form', 'submit application', 'apply for this position',
                'candidate information', 'application details', 'join our team', 'career opportunity',
                'employment application', 'we\'re hiring', 'become part of our team'
            ] 
        },
        // Page headings (medium indicators)
        headingMedium: { 
            points: 2, 
            list: [
                'job description', 'your details', 'personal information', 'work experience', 'education',
                'candidate profile', 'equal opportunity', 'about you', 'your background', 'qualifications',
                'skills and experience', 'professional background'
            ] 
        },
        // Page text indicators
        pageText: { 
            points: 0.3, 
            list: [
                'submit application', 'equal opportunity employer', 'eoe', 'diversity and inclusion',
                'required qualifications', 'preferred qualifications', 'responsibilities', 'benefits',
                'employment type', 'job id', 'position available', 'we are hiring', 'join our team',
                'competitive salary', 'full-time', 'part-time', 'remote work', 'work from home'
            ] 
        }
    };

    // Adjusted threshold for better balance
    const SCORE_THRESHOLD = 8;

    // --- Enhanced Checks --- 

    // 1. Enhanced URL Analysis
    const urlPath = window.location.pathname.toLowerCase();
    
    // Check for strong URL indicators first
    keywords.urlStrong.list.forEach(keyword => {
        if (currentUrl.includes(keyword)) {
            console.log(` +${keywords.urlStrong.points} score from Strong URL keyword: ${keyword}`);
            score += keywords.urlStrong.points;
            detectionDetails.push(`Strong URL ('${keyword}')`);
        }
    });
    
    // Only check medium URL indicators if no strong ones found
    if (!detectionDetails.some(detail => detail.includes('Strong URL'))) {
        keywords.urlMedium.list.forEach(keyword => {
            if (currentUrl.includes(keyword)) {
                console.log(` +${keywords.urlMedium.points} score from Medium URL keyword: ${keyword}`);
                score += keywords.urlMedium.points;
                detectionDetails.push(`Medium URL ('${keyword}')`);
            }
        });
    }

    // 2. Enhanced Title Analysis
    // Check for strong title indicators first
    keywords.title.list.forEach(keyword => {
        if (pageTitle.includes(keyword)) {
            console.log(` +${keywords.title.points} score from Strong Title keyword: ${keyword}`);
            score += keywords.title.points;
            detectionDetails.push(`Strong Title ('${keyword}')`);
        }
    });
    
    // Check medium title indicators if no strong ones found
    if (!detectionDetails.some(detail => detail.includes('Strong Title'))) {
        keywords.titleMedium.list.forEach(keyword => {
            if (pageTitle.includes(keyword)) {
                console.log(` +${keywords.titleMedium.points} score from Medium Title keyword: ${keyword}`);
                score += keywords.titleMedium.points;
                detectionDetails.push(`Medium Title ('${keyword}')`);
            }
        });
    }

    // 3. Enhanced Form Input Analysis
    const inputs = document.querySelectorAll('input, textarea, select');
    let uniqueFormMatches = new Set();
    
    // Check for file upload inputs (strong indicator for job applications)
    const fileInputs = document.querySelectorAll('input[type="file"]');
    if (fileInputs.length > 0) {
        fileInputs.forEach(input => {
            const accept = input.getAttribute('accept')?.toLowerCase() || '';
            const name = input.getAttribute('name')?.toLowerCase() || '';
            const id = input.getAttribute('id')?.toLowerCase() || '';
            const labelText = input.labels ? Array.from(input.labels).map(l => l.textContent.toLowerCase()).join(' ') : '';
            
            if (accept.includes('pdf') || accept.includes('doc') || accept.includes('.doc') ||
                name.includes('resume') || name.includes('cv') || 
                id.includes('resume') || id.includes('cv') ||
                labelText.includes('resume') || labelText.includes('cv') ||
                labelText.includes('upload') && (labelText.includes('document') || labelText.includes('file'))) {
                score += 6;
                detectionDetails.push('File Upload (resume/CV)');
                console.log(' +6 score from file upload input (resume/CV)');
            }
        });
    }
    
    inputs.forEach(input => {
        const name = input.getAttribute('name')?.toLowerCase() || '';
        const id = input.getAttribute('id')?.toLowerCase() || '';
        const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';
        const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
        const labelText = input.labels ? Array.from(input.labels).map(l => l.textContent.toLowerCase()).join(' ') : '';
        const combinedText = `${name} ${id} ${placeholder} ${ariaLabel} ${labelText}`;
        
        // Check strong form indicators first
        keywords.formInputStrong.list.forEach(keyword => {
            if (combinedText.includes(keyword) && !uniqueFormMatches.has(keyword)) {
                console.log(` +${keywords.formInputStrong.points} score from Strong Form Input keyword: ${keyword}`);
                score += keywords.formInputStrong.points;
                uniqueFormMatches.add(keyword);
                detectionDetails.push(`Strong Input ('${keyword}')`);
            }
        });
        
        // Check medium form indicators
        keywords.formInputMedium.list.forEach(keyword => {
            if (combinedText.includes(keyword) && !uniqueFormMatches.has(keyword)) {
                console.log(` +${keywords.formInputMedium.points} score from Medium Form Input keyword: ${keyword}`);
                score += keywords.formInputMedium.points;
                uniqueFormMatches.add(keyword);
                detectionDetails.push(`Medium Input ('${keyword}')`);
            }
        });
        
        // Check basic form indicators (limited to avoid over-scoring)
        keywords.formInputBasic.list.forEach(keyword => {
            if (combinedText.includes(keyword) && !uniqueFormMatches.has(keyword)) {
                console.log(` +${keywords.formInputBasic.points} score from Basic Form Input keyword: ${keyword}`);
                score += keywords.formInputBasic.points;
                uniqueFormMatches.add(keyword);
                detectionDetails.push(`Basic Input ('${keyword}')`);
            }
        });
    });

    // 4. Enhanced Heading Analysis
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let uniqueHeadingMatches = new Set();
    
    headings.forEach(heading => {
        const headingText = heading.textContent.toLowerCase();
        
        // Check strong heading indicators first
        keywords.headingStrong.list.forEach(keyword => {
            if (headingText.includes(keyword) && !uniqueHeadingMatches.has(keyword)) {
                console.log(` +${keywords.headingStrong.points} score from Strong Heading keyword: ${keyword}`);
                score += keywords.headingStrong.points;
                uniqueHeadingMatches.add(keyword);
                detectionDetails.push(`Strong Heading ('${keyword}')`);
            }
        });
        
        // Check medium heading indicators
        keywords.headingMedium.list.forEach(keyword => {
            if (headingText.includes(keyword) && !uniqueHeadingMatches.has(keyword)) {
                console.log(` +${keywords.headingMedium.points} score from Medium Heading keyword: ${keyword}`);
                score += keywords.headingMedium.points;
                uniqueHeadingMatches.add(keyword);
                detectionDetails.push(`Medium Heading ('${keyword}')`);
            }
        });
    });

    // 5. Enhanced Page Text Analysis (limited scope for performance)
    const textElements = document.querySelectorAll('p, li, dt, dd, span, div[class*="description"], div[class*="content"]');
    let uniqueTextMatches = new Set();
    let textMatchCount = 0;
    const MAX_TEXT_MATCHES = 8; // Reduced to prevent over-scoring
    
    textElements.forEach(el => {
        if (textMatchCount >= MAX_TEXT_MATCHES) return;
        const elementText = el.textContent.toLowerCase();
        
        // Only check reasonably sized text elements
        if (elementText.length > 10 && elementText.length < 1000) { 
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

    // 6. Additional Heuristics
    
    // Check for submit buttons with job-related text
    const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button');
    submitButtons.forEach(button => {
        const buttonText = button.textContent?.toLowerCase() || button.value?.toLowerCase() || '';
        if (buttonText.includes('apply') || buttonText.includes('submit application') || 
            buttonText.includes('send application') || buttonText.includes('continue application')) {
            score += 4;
            detectionDetails.push('Submit Button (apply/application)');
            console.log(' +4 score from submit button with application text');
        }
    });
    
    // Check for form elements count (job applications typically have many fields)
    const formFieldCount = inputs.length;
    if (formFieldCount >= 8) {
        score += 2;
        detectionDetails.push(`Form Complexity (${formFieldCount} fields)`);
        console.log(` +2 score from form complexity (${formFieldCount} fields)`);
    } else if (formFieldCount >= 15) {
        score += 3; // Extra point for very complex forms
        detectionDetails.push(`High Form Complexity (${formFieldCount} fields)`);
        console.log(` +3 score from high form complexity (${formFieldCount} fields)`);
    }
    
    // Check for specific job application form structures
    const hasRequiredJobFields = [
        'input[name*="resume"], input[id*="resume"]',
        'input[name*="first"], input[id*="first"]',
        'input[name*="last"], input[id*="last"]',
        'input[name*="email"], input[id*="email"]'
    ].filter(selector => document.querySelector(selector)).length;
    
    if (hasRequiredJobFields >= 3) {
        score += 3;
        detectionDetails.push('Job Application Structure');
        console.log(' +3 score from typical job application field structure');
    }
    
    // Penalty for common non-job pages
    const excludePatterns = ['login', 'signin', 'register', 'signup', 'checkout', 'payment', 'cart', 'contact', 'newsletter', 'subscribe'];
    const hasExcludePattern = excludePatterns.some(pattern => 
        currentUrl.includes(pattern) || pageTitle.includes(pattern)
    );
    
    if (hasExcludePattern) {
        score -= 5;
        detectionDetails.push('Penalty (non-job page pattern)');
        console.log(' -5 score penalty for non-job page pattern');
    }

    // --- Determine Result --- 
    const isJobPage = score >= SCORE_THRESHOLD;
    const method = isJobPage ? `Enhanced Score (${score.toFixed(1)} >= ${SCORE_THRESHOLD})` : `Enhanced Score (${score.toFixed(1)} < ${SCORE_THRESHOLD})`;

    console.log(`Job Application Filler: Final Enhanced Score = ${score.toFixed(1)}. Threshold = ${SCORE_THRESHOLD}. Is Job Page = ${isJobPage}`);
    if (isJobPage) {
        console.log("Contributing factors:", detectionDetails.join(', '));
    } else {
        console.log("Detection factors found:", detectionDetails.join(', '));
    }

    return { isJobPage: isJobPage, method: method };
}

// Function to fill form fields based on user profile data
async function fillFormFields(profile) {
    console.log("Starting to fill form fields with profile data:", profile);
    
    // Safety function to access profile properties
    const getProfileValue = (key) => {
        try {
            return profile[key] || '';
        } catch (e) {
            console.warn(`Error accessing profile.${key}:`, e);
            return '';
        }
    };
    
    // Get the first and last name with fallbacks
    const firstName = getProfileValue('first_name');
    const lastName = getProfileValue('last_name');
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
    
    // Map of common field identifiers to profile data
    const fieldMappings = {
        // Basic Info
        'first_name': firstName,
        'last_name': lastName,
        'name': fullName,
        'full_name': fullName,
        'email': getProfileValue('email'),
        'phone': getProfileValue('phone'),
        
        // Address (structured fields)
        'address': getProfileValue('full_address'), // Generated full address field
        'street_address': getProfileValue('street_address'),
        'address_line_1': getProfileValue('street_address'),
        'address_line_2': getProfileValue('address_line_2'),
        'city': getProfileValue('city'),
        'state': getProfileValue('state_province'), 
        'province': getProfileValue('state_province'),
        'state_province': getProfileValue('state_province'),
        'zip': getProfileValue('zip_postal_code'),
        'postal_code': getProfileValue('zip_postal_code'),
        'zip_code': getProfileValue('zip_postal_code'),
        'country': getProfileValue('country') || 'United States',
        
        // Social profiles
        'linkedin': getProfileValue('linkedin_url'),
        'github': getProfileValue('github_url'),
        'portfolio': getProfileValue('portfolio_url'),
        'website': getProfileValue('website_url'),
        
        // Additional fields
        'desired_salary': getProfileValue('desired_salary'),
        'work_authorization': getProfileValue('work_authorization'),
        'preferred_location': getProfileValue('preferred_location')
    };
    
    // Find and fill input fields
    const inputs = document.querySelectorAll('input, textarea, select');
    let filledCount = 0;
    
    inputs.forEach(input => {
        const name = input.getAttribute('name')?.toLowerCase() || '';
        const id = input.getAttribute('id')?.toLowerCase() || '';
        const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';
        const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
        const labelText = input.labels ? Array.from(input.labels).map(l => l.textContent.toLowerCase()).join(' ') : '';
        const type = input.getAttribute('type')?.toLowerCase() || '';
        
        // Check input fields against our mapping
        for (const [fieldKey, fieldValue] of Object.entries(fieldMappings)) {
            if (!fieldValue) continue; // Skip empty values
            
            const shouldFill = 
                name.includes(fieldKey) || 
                id.includes(fieldKey) || 
                placeholder.includes(fieldKey) || 
                ariaLabel.includes(fieldKey) || 
                labelText.includes(fieldKey);
                
            if (shouldFill) {
                // Handle checkboxes and radio buttons differently
                if (type === 'checkbox' || type === 'radio') {
                    // Only handle boolean fields like willing_to_relocate
                    if (fieldKey === 'willing_to_relocate' && fieldValue === true) {
                        input.checked = true;
                    }
                } else {
                    // For text fields, assign the value
                    input.value = fieldValue;
                    // Trigger change event to notify the form
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    filledCount++;
                    console.log(`Filled ${fieldKey} with "${fieldValue}"`);
                }
                
                // Break after finding the first match for this input
                break;
            }
        }
    });
    
    console.log(`Filled ${filledCount} fields on the page`);
    return filledCount;
}

// Function to extract job information from the page
function extractJobInfo() {
    // Get the page title and URL
    const pageTitle = document.title;
    const pageUrl = window.location.href;
    
    // Initialize job info
    const jobInfo = {
        job_url: pageUrl,
        job_title: null,
        company_name: null,
        job_description: null,
        job_location: null,
        application_status: 'applied'
    };
    
    // Try to extract job title and company name from the page title
    // Assume format is "Job Title - Company Name" or similar
    const titleParts = pageTitle.split(/\s*[-|–]\s*/);
    if (titleParts.length >= 2) {
        jobInfo.job_title = titleParts[0].trim();
        jobInfo.company_name = titleParts[1].trim();
    } else {
        jobInfo.job_title = pageTitle.trim();
    }
    
    // Try to extract job description
    // Look for common job description containers
    const descriptionSelectors = [
        '.job-description',
        '#job-description',
        '[data-test="job-description"]',
        '.description',
        '.job-details',
        '.details',
        'section.description',
        'div[class*="description"]',
        'div[class*="job-description"]',
        'div[id*="job-description"]'
    ];
    
    for (const selector of descriptionSelectors) {
        const descElement = document.querySelector(selector);
        if (descElement) {
            jobInfo.job_description = descElement.textContent.trim().substring(0, 500); // Limit length
            break;
        }
    }
    
    // Try to extract job location
    // Look for location in meta tags or common location elements
    const locationSelectors = [
        'meta[name="job-location"]',
        'meta[property="job:location"]',
        '.job-location',
        '.location',
        '[data-test="location"]',
        'div[class*="location"]',
        'span[class*="location"]'
    ];
    
    for (const selector of locationSelectors) {
        const locElement = document.querySelector(selector);
        if (locElement) {
            if (locElement.tagName === 'META') {
                jobInfo.job_location = locElement.getAttribute('content');
            } else {
                jobInfo.job_location = locElement.textContent.trim();
            }
            break;
        }
    }
    
    return jobInfo;
}

// Function to collect form data from the page
function collectFormData() {
    const formData = {
        answers_provided: {},
        custom_fields: {}
    };
    
    // Get all input elements on the page
    const inputs = document.querySelectorAll('input, textarea, select');
    
    // Loop through inputs and collect values
    inputs.forEach(input => {
        // Skip hidden inputs and those without values or names/ids
        if (input.type === 'hidden' || !input.value || (!input.name && !input.id)) {
            return;
        }
        
        // Get the field identifier (prefer name, fallback to id)
        const fieldId = input.name || input.id;
        
        // Get the field label if possible
        let fieldLabel = '';
        
        // Try to find label by for attribute
        if (fieldId) {
            const label = document.querySelector(`label[for="${fieldId}"]`);
            if (label) {
                fieldLabel = label.textContent.trim();
            }
        }
        
        // If no label found and input has a parent, try to find preceding label-like element
        if (!fieldLabel && input.parentElement) {
            // Look for label-like elements (label, div with label-like classes, preceding span)
            const possibleLabels = [
                ...input.parentElement.querySelectorAll('label'),
                ...input.parentElement.querySelectorAll('div[class*="label"]'),
                ...input.parentElement.querySelectorAll('span[class*="label"]'),
                ...input.parentElement.querySelectorAll('div[class*="field-name"]'),
                ...input.parentElement.querySelectorAll('span[class*="field-name"]')
            ];
            
            // Use the first non-empty label text found
            for (const elem of possibleLabels) {
                const text = elem.textContent.trim();
                if (text) {
                    fieldLabel = text;
                    break;
                }
            }
        }
        
        // Final fallback - use field id/name as label
        if (!fieldLabel) {
            fieldLabel = fieldId
                .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
                .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
                .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
                .trim();
        }
        
        // Store the field value with its label
        formData.answers_provided[fieldLabel] = input.value;
    });
    
    // Get resume and cover letter used (if available)
    const resumeInput = document.querySelector('input[type="file"][accept*="pdf"][name*="resume"], input[type="file"][accept*="pdf"][id*="resume"]');
    if (resumeInput && resumeInput.files && resumeInput.files[0]) {
        formData.resume_used = resumeInput.files[0].name;
    }
    
    const coverLetterInput = document.querySelector('input[type="file"][accept*="pdf"][name*="cover"], input[type="file"][accept*="pdf"][id*="cover"]');
    if (coverLetterInput && coverLetterInput.files && coverLetterInput.files[0]) {
        formData.cover_letter_used = coverLetterInput.files[0].name;
    }
    
    // Store any other custom data
    formData.custom_fields = {
        'page_url': window.location.href,
        'page_title': document.title,
        'form_submission_time': new Date().toISOString()
    };
    
    return formData;
}

// Function to save a job application to Supabase
function saveJobApplication(jobInfo) {
    return new Promise((resolve, reject) => {
        // Collect form data from the page
        const applicationContent = collectFormData();
        
        chrome.runtime.sendMessage({ 
            type: 'SAVE_JOB_APPLICATION', 
            jobApplication: jobInfo,
            applicationContent: applicationContent
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error saving job application:", chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError);
                return;
            }
            
            if (response && response.success) {
                console.log("Job application saved successfully:", response.data);
                console.log("Application content saved:", response.content);
                resolve(response.data);
            } else {
                console.error("Error from service worker:", response?.error || "Unknown error");
                reject(new Error(response?.error || "Failed to save job application"));
            }
        });
    });
}

// Setup message listener for form filling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_FILLING') {
        console.log("Received START_FILLING message in content script");
        
        // Request user profile data from service worker
        chrome.runtime.sendMessage({ type: 'GET_PROFILE_DATA' }, async (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting profile data:", chrome.runtime.lastError.message);
                sendResponse({ status: "Error: Could not get profile data" });
                return;
            }
            
            if (!response || !response.profile) {
                console.error("Invalid profile data received:", response);
                sendResponse({ status: "Error: Invalid profile data" });
                return;
            }
            
            try {
                // Fill form fields
                const filledCount = await fillFormFields(response.profile);
                
                // Extract and save job information
                const jobInfo = extractJobInfo();
                
                try {
                    // Save the job application
                    await saveJobApplication(jobInfo);
                    
                    sendResponse({ 
                        status: `Success: Filled ${filledCount} fields and saved job application`,
                        filledCount: filledCount,
                        savedJob: true
                    });
                } catch (saveError) {
                    console.error("Error saving job application:", saveError);
                    sendResponse({ 
                        status: `Filled ${filledCount} fields but failed to save job: ${saveError.message}`,
                        filledCount: filledCount,
                        savedJob: false,
                        saveError: saveError.message
                    });
                }
            } catch (error) {
                console.error("Error filling form:", error);
                sendResponse({ 
                    status: `Error filling form: ${error.message}`,
                    error: error.message
                });
            }
        });
        
        return true; // Keep the message channel open for async response
    }
});

// Function to run detection with retry logic for dynamic content
async function runDetectionWithRetry() {
    let attempts = 0;
    const maxAttempts = 3;
    const delays = [500, 1500, 3000]; // Progressive delays in milliseconds
    
    while (attempts < maxAttempts) {
        try {
            const detectionResult = await checkJobApplicationPage();
            console.log(`Job Application Filler: Detection Result (attempt ${attempts + 1}):`, detectionResult);
            
            // If we found a job page or this is our last attempt, proceed
            if (detectionResult.isJobPage || attempts === maxAttempts - 1) {
                // Send message to service worker 
                chrome.runtime.sendMessage({ 
                    type: 'PAGE_CHECK_RESULT', 
                    isJobPage: detectionResult.isJobPage,
                    detectionMethod: detectionResult.method
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        // console.warn("Could not send PAGE_CHECK_RESULT:", chrome.runtime.lastError.message);
                    }
                }); 

                // Display popup if it's a job page
                if (detectionResult.isJobPage) {
                    console.log("Job page detected, displaying notification popup.");
                    displayDetectionPopup();
                }
                
                return; // Exit the retry loop
            }
            
            // If no job page detected and we have more attempts, wait and try again
            attempts++;
            if (attempts < maxAttempts) {
                console.log(`Job Application Filler: No job page detected, retrying in ${delays[attempts - 1]}ms...`);
                await new Promise(resolve => setTimeout(resolve, delays[attempts - 1]));
            }
            
        } catch (error) {
            console.error(`Error during job page check (attempt ${attempts + 1}):`, error);
            attempts++;
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delays[attempts - 1]));
            }
        }
    }
}

// Wait for page to be ready and then run detection
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDetectionWithRetry);
} else {
    // Page is already loaded, run detection after a short delay to catch any dynamic content
    setTimeout(runDetectionWithRetry, 100);
} 