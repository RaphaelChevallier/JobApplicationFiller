// AI Instructions Protocol for Chrome Extension
// This defines the standardized format for AI-generated form filling instructions

/**
 * Standard Instruction Types
 */
const INSTRUCTION_TYPES = {
    FILL_FIELD: 'fill_field',
    SELECT_OPTION: 'select_option',
    CLICK_BUTTON: 'click_button',
    NAVIGATE_NEXT: 'navigate_next',
    WAIT: 'wait',
    SCROLL: 'scroll',
    UPLOAD_FILE: 'upload_file',
    CHECK_CHECKBOX: 'check_checkbox',
    VALIDATE_PAGE: 'validate_page'
};

/**
 * Standard Selector Types for reliable element targeting
 */
const SELECTOR_TYPES = {
    ID: 'id',
    NAME: 'name',
    XPATH: 'xpath',
    CSS: 'css',
    TEXT: 'text',
    PLACEHOLDER: 'placeholder',
    ARIA_LABEL: 'aria_label'
};

/**
 * Standard Response Format from AI Edge Function
 */
const AI_RESPONSE_SCHEMA = {
    success: true,
    pages: [
        {
            page_number: 1,
            page_url: "current_page_url",
            page_title: "Page Title",
            instructions: [
                {
                    type: "fill_field",
                    selector: {
                        type: "id",
                        value: "firstName"
                    },
                    value: "John",
                    field_description: "First Name field",
                    confidence: 0.95,
                    required: true
                }
            ],
            navigation: {
                has_next: true,
                next_button: {
                    type: "click_button",
                    selector: {
                        type: "css",
                        value: "button[type='submit']:contains('Next')"
                    }
                }
            },
            validation: {
                success_indicators: ["Next page loaded", "Progress bar advanced"],
                error_indicators: ["Error message", "Required field highlight"]
            }
        }
    ],
    total_pages: 3,
    estimated_completion_time: 45000, // milliseconds
    user_profile_used: {
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com"
    }
};

/**
 * Instruction Execution Engine for Chrome Extension
 */
class AIInstructionExecutor {
    constructor() {
        this.currentPageIndex = 0;
        this.instructions = null;
        this.executionLog = [];
        this.isExecuting = false;
    }

    /**
     * Execute AI-generated instructions
     */
    async executeInstructions(aiResponse) {
        if (!this.validateResponse(aiResponse)) {
            throw new Error('Invalid AI response format');
        }

        this.instructions = aiResponse;
        this.isExecuting = true;
        
        try {
            for (let pageIndex = 0; pageIndex < aiResponse.pages.length; pageIndex++) {
                this.currentPageIndex = pageIndex;
                const page = aiResponse.pages[pageIndex];
                
                console.log(`Executing page ${pageIndex + 1}/${aiResponse.total_pages}: ${page.page_title}`);
                
                // Validate we're on the correct page
                await this.validatePage(page);
                
                // Execute page instructions
                await this.executePage(page);
                
                // Navigate to next page if not the last page
                if (pageIndex < aiResponse.pages.length - 1 && page.navigation.has_next) {
                    await this.navigateNext(page.navigation.next_button);
                    await this.waitForPageLoad();
                }
            }
            
            console.log('All instructions executed successfully');
            return { success: true, log: this.executionLog };
            
        } catch (error) {
            console.error('Instruction execution failed:', error);
            return { success: false, error: error.message, log: this.executionLog };
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Execute instructions for a single page
     */
    async executePage(page) {
        for (const instruction of page.instructions) {
            try {
                await this.executeInstruction(instruction);
                this.logExecution(instruction, 'success');
                
                // Small delay between instructions for stability
                await this.wait(200);
                
            } catch (error) {
                this.logExecution(instruction, 'error', error.message);
                
                // Continue with other instructions unless it's a critical field
                if (instruction.required) {
                    throw new Error(`Failed to execute required instruction: ${error.message}`);
                }
            }
        }
    }

    /**
     * Execute a single instruction
     */
    async executeInstruction(instruction) {
        const element = await this.findElement(instruction.selector);
        
        if (!element) {
            throw new Error(`Element not found: ${JSON.stringify(instruction.selector)}`);
        }

        switch (instruction.type) {
            case INSTRUCTION_TYPES.FILL_FIELD:
                await this.fillField(element, instruction.value);
                break;
                
            case INSTRUCTION_TYPES.SELECT_OPTION:
                await this.selectOption(element, instruction.value);
                break;
                
            case INSTRUCTION_TYPES.CLICK_BUTTON:
                await this.clickButton(element);
                break;
                
            case INSTRUCTION_TYPES.CHECK_CHECKBOX:
                await this.checkCheckbox(element, instruction.checked);
                break;
                
            case INSTRUCTION_TYPES.UPLOAD_FILE:
                await this.uploadFile(element, instruction.file_path);
                break;
                
            case INSTRUCTION_TYPES.SCROLL:
                await this.scrollToElement(element);
                break;
                
            case INSTRUCTION_TYPES.WAIT:
                await this.wait(instruction.duration);
                break;
                
            default:
                throw new Error(`Unknown instruction type: ${instruction.type}`);
        }
    }

    /**
     * Find element using standardized selectors
     */
    async findElement(selector) {
        let element = null;
        
        switch (selector.type) {
            case SELECTOR_TYPES.ID:
                element = document.getElementById(selector.value);
                break;
                
            case SELECTOR_TYPES.NAME:
                element = document.querySelector(`[name="${selector.value}"]`);
                break;
                
            case SELECTOR_TYPES.CSS:
                element = document.querySelector(selector.value);
                break;
                
            case SELECTOR_TYPES.XPATH:
                element = document.evaluate(
                    selector.value,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;
                break;
                
            case SELECTOR_TYPES.TEXT:
                element = this.findElementByText(selector.value);
                break;
                
            case SELECTOR_TYPES.PLACEHOLDER:
                element = document.querySelector(`[placeholder="${selector.value}"]`);
                break;
                
            case SELECTOR_TYPES.ARIA_LABEL:
                element = document.querySelector(`[aria-label="${selector.value}"]`);
                break;
        }
        
        // If element is not visible, scroll to it
        if (element && !this.isElementVisible(element)) {
            await this.scrollToElement(element);
        }
        
        return element;
    }

    /**
     * Fill a form field with value
     */
    async fillField(element, value) {
        // Clear existing value
        element.value = '';
        element.focus();
        
        // Type the value character by character for better compatibility
        for (const char of value) {
            element.value += char;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await this.wait(50); // Small delay between characters
        }
        
        // Trigger change event
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.blur();
    }

    /**
     * Select an option from dropdown
     */
    async selectOption(element, value) {
        if (element.tagName === 'SELECT') {
            // Find option by value or text
            const option = Array.from(element.options).find(opt => 
                opt.value === value || opt.textContent.trim() === value
            );
            
            if (option) {
                element.value = option.value;
                element.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                throw new Error(`Option not found: ${value}`);
            }
        } else {
            throw new Error('Element is not a select dropdown');
        }
    }

    /**
     * Click a button or clickable element
     */
    async clickButton(element) {
        // Ensure element is clickable
        if (element.disabled) {
            throw new Error('Element is disabled');
        }
        
        // Scroll to element if needed
        await this.scrollToElement(element);
        
        // Click the element
        element.click();
    }

    /**
     * Check or uncheck a checkbox
     */
    async checkCheckbox(element, checked = true) {
        if (element.type !== 'checkbox') {
            throw new Error('Element is not a checkbox');
        }
        
        if (element.checked !== checked) {
            element.click();
        }
    }

    /**
     * Navigate to next page
     */
    async navigateNext(nextButton) {
        await this.executeInstruction(nextButton);
    }

    /**
     * Wait for page to load after navigation
     */
    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                setTimeout(resolve, 1000); // Additional wait for dynamic content
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(resolve, 1000);
                });
            }
        });
    }

    /**
     * Validate page matches expected page
     */
    async validatePage(page) {
        const currentUrl = window.location.href;
        const currentTitle = document.title;
        
        // Basic validation - can be enhanced
        console.log(`Validating page: ${currentTitle} at ${currentUrl}`);
        
        // Check for success/error indicators if provided
        if (page.validation) {
            for (const indicator of page.validation.error_indicators) {
                if (document.body.textContent.includes(indicator)) {
                    throw new Error(`Error indicator found: ${indicator}`);
                }
            }
        }
    }

    /**
     * Utility functions
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    scrollToElement(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return this.wait(500); // Wait for scroll to complete
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && 
               rect.bottom <= window.innerHeight && 
               rect.right <= window.innerWidth;
    }

    findElementByText(text) {
        const xpath = `//*[contains(text(), "${text}")]`;
        return document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;
    }

    validateResponse(response) {
        return response && 
               response.success && 
               Array.isArray(response.pages) && 
               response.pages.length > 0;
    }

    logExecution(instruction, status, error = null) {
        this.executionLog.push({
            timestamp: new Date().toISOString(),
            instruction: instruction.type,
            selector: instruction.selector,
            status,
            error
        });
    }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIInstructionExecutor, INSTRUCTION_TYPES, SELECTOR_TYPES };
} 