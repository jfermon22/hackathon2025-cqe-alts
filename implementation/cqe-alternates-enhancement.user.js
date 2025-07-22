// ==UserScript==
// @name         CQE Alternate Selection Enhancement
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  Enhanced alternate selection for Custom Quotes Engine
// @author       Amazon
// @match        https://www.amazon.com/ab/bulk-order/input*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration and selectors based on HTML analysis
    const CQE_SELECTORS = {
        productTable: '.ink_Table_1smr14t0.ink_Table_1smr14t1',
        productRows: 'tbody tr[data-key]',
        dropdownMenus: '.b-dropdown-menu',
        modalRoot: '#offer-selection-slider-root',
        asinInput: '#add-asin-or-isbn-form',
        pageHeader: '#cqe_quote_request_a_quote_header'
    };
    
    // Debug logging
    function log(message, data = null) {
        console.log(`[CQE Alternates] ${message}`, data || '');
    }
    
    // Check if we're on the correct CQE page
    function isCQEQuotePage() {
        const header = document.querySelector(CQE_SELECTORS.pageHeader);
        const breadcrumb = document.querySelector('.b-breadcrumb');
        
        if (header && header.textContent.includes('Request a quote')) {
            log('CQE Quote Request page detected');
            return true;
        }
        
        if (breadcrumb && breadcrumb.textContent.includes('Bulk ordering')) {
            log('CQE Bulk ordering page detected via breadcrumb');
            return true;
        }
        
        return false;
    }
    
    // Extract product data from a table row
    function extractProductData(rowElement) {
        try {
            const rowKey = rowElement.getAttribute('data-key');
            
            const productData = {
                id: rowKey,
                asin: document.querySelector(CQE_SELECTORS.asinInput)?.value || '',
                name: rowElement.querySelector('.ink_typography_1lzltdc5')?.textContent?.trim() || '',
                image: rowElement.querySelector('img')?.src || '',
                quantity: rowElement.querySelector('.product-quantity')?.value || '',
                totalPrice: rowElement.querySelector('[data-inclusive-price]')?.getAttribute('data-inclusive-price') || '',
                unitPrice: rowElement.querySelector('[data-inclusive-unit-price]')?.getAttribute('data-inclusive-unit-price') || '',
                seller: rowElement.querySelector('.seller-performance-link')?.textContent?.trim() || '',
                merchantName: rowElement.querySelector('[data-merchant-name]')?.getAttribute('data-merchant-name') || ''
            };
            
            log('Extracted product data:', productData);
            return productData;
        } catch (error) {
            log('Error extracting product data:', error);
            return null;
        }
    }
    
    // Create modal HTML structure
    function createModal() {
        const modalHtml = `
            <div id="cqe-alternates-modal" class="cqe-modal-overlay" style="display: none;">
                <div class="cqe-modal-content">
                    <div class="cqe-modal-header">
                        <h3>Add Alternate Products</h3>
                        <button class="cqe-modal-close" type="button">&times;</button>
                    </div>
                    
                    <div class="cqe-product-context" id="cqe-product-context">
                        <!-- Product context will be inserted here -->
                    </div>
                    
                    <div class="cqe-chat-container">
                        <div id="cqe-chat-messages" class="cqe-chat-messages">
                            <div class="chat-message assistant">
                                <strong>Assistant:</strong> I'll help you find suitable alternate products. Let me start by asking: would you be willing to accept alternate ASINs for this request? This can help you get better pricing and availability options.
                            </div>
                        </div>
                        
                        <div class="cqe-chat-input-container">
                            <input type="text" 
                                   id="cqe-chat-input" 
                                   class="b-form-control" 
                                   placeholder="Type your response..."
                                   style="flex: 1;">
                            <button id="cqe-chat-send" class="b-button">Send</button>
                        </div>
                    </div>
                    
                    <div id="cqe-manual-asin-section" class="cqe-section" style="display:none;">
                        <h4>Add ASINs Manually</h4>
                        <div class="cqe-manual-input">
                            <input type="text" 
                                   id="cqe-manual-asin" 
                                   class="b-form-control" 
                                   placeholder="Enter ASIN (e.g., B08N5WRWNW) or Amazon URL">
                            <button id="cqe-add-asin" class="b-button b-outline">Add ASIN</button>
                        </div>
                        <div class="input-help" style="font-size: 0.8rem; color: #666; margin-bottom: 1rem;">
                            You can enter a 10-character ASIN or paste an Amazon product URL
                        </div>
                        <div id="cqe-manual-asins-list"></div>
                    </div>
                    
                    <div id="cqe-alternates-selection" class="cqe-section" style="display:none;">
                        <h4>Select Suitable Alternates</h4>
                        <div id="cqe-suggested-alternates"></div>
                    </div>
                    
                    <div class="cqe-modal-footer">
                        <button id="cqe-cancel-alternates" class="b-button b-outline">Cancel</button>
                        <button id="cqe-confirm-alternates" class="b-button" disabled>
                            Add Selected Alternates
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert modal into DOM
        const modalRoot = document.querySelector(CQE_SELECTORS.modalRoot) || document.body;
        modalRoot.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add CSS styles
        addModalStyles();
        
        // Setup modal event handlers
        setupModalEventHandlers();
        
        log('Modal created and initialized');
        return document.querySelector('#cqe-alternates-modal');
    }
    
    // Add CSS styles for the modal
    function addModalStyles() {
        const styles = `
            <style id="cqe-modal-styles">
                /* Modal overlay */
                .cqe-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                /* Modal content */
                .cqe-modal-content {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    width: 600px;
                    max-width: 90vw;
                    max-height: 80vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                /* Modal header */
                .cqe-modal-header {
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid #ddd;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8f9fa;
                }
                
                .cqe-modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .cqe-modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                }
                
                .cqe-modal-close:hover {
                    background: rgba(0, 0, 0, 0.1);
                }
                
                /* Product context */
                .cqe-product-context {
                    padding: 1rem 1.5rem;
                    background: #f0f8ff;
                    border-bottom: 1px solid #ddd;
                    font-size: 0.9rem;
                }
                
                /* Chat container */
                .cqe-chat-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 300px;
                }
                
                .cqe-chat-messages {
                    flex: 1;
                    padding: 1rem;
                    overflow-y: auto;
                    max-height: 300px;
                }
                
                /* Chat messages */
                .chat-message {
                    margin-bottom: 1rem;
                    padding: 0.75rem;
                    border-radius: 8px;
                    line-height: 1.4;
                }
                
                .chat-message.user {
                    background: #e3f2fd;
                    margin-left: 2rem;
                }
                
                .chat-message.assistant {
                    background: #f5f5f5;
                    margin-right: 2rem;
                }
                
                .chat-message strong {
                    display: block;
                    margin-bottom: 0.25rem;
                    font-size: 0.9rem;
                    color: #666;
                }
                
                /* Chat input */
                .cqe-chat-input-container {
                    padding: 1rem;
                    border-top: 1px solid #ddd;
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                
                /* Sections */
                .cqe-section {
                    padding: 1rem 1.5rem;
                    border-top: 1px solid #ddd;
                }
                
                .cqe-section h4 {
                    margin: 0 0 1rem 0;
                    font-size: 1rem;
                    font-weight: 600;
                }
                
                .cqe-manual-input {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                
                /* Modal footer */
                .cqe-modal-footer {
                    padding: 1rem 1.5rem;
                    border-top: 1px solid #ddd;
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    background: #f8f9fa;
                }
                
                /* Button overrides for consistency */
                .cqe-modal-content .b-button {
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    font-size: 0.9rem;
                    cursor: pointer;
                    border: 1px solid #007185;
                    background: #007185;
                    color: white;
                }
                
                .cqe-modal-content .b-button:hover {
                    background: #005a6b;
                }
                
                .cqe-modal-content .b-button.b-outline {
                    background: white;
                    color: #007185;
                }
                
                .cqe-modal-content .b-button.b-outline:hover {
                    background: #f0f8ff;
                }
                
                .cqe-modal-content .b-button:disabled {
                    background: #ccc;
                    border-color: #ccc;
                    color: #666;
                    cursor: not-allowed;
                }
                
                .cqe-modal-content .b-form-control {
                    padding: 0.5rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 0.9rem;
                }
            </style>
        `;
        
        // Add styles to head if not already present
        if (!document.querySelector('#cqe-modal-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
    }
    
    // Setup modal event handlers
    function setupModalEventHandlers() {
        // Close modal handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.cqe-modal-close, #cqe-cancel-alternates')) {
                closeModal();
            }
            
            if (e.target.matches('.cqe-modal-overlay')) {
                closeModal();
            }
            
            // Manual ASIN add button
            if (e.target.matches('#cqe-add-asin')) {
                handleManualASINAdd();
            }
            
            // Chat send button
            if (e.target.matches('#cqe-chat-send')) {
                sendChatMessage();
            }
            
            // Confirm alternates button
            if (e.target.matches('#cqe-confirm-alternates')) {
                handleConfirmAlternates();
            }
        });
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector('#cqe-alternates-modal');
                if (modal && modal.style.display !== 'none') {
                    closeModal();
                }
            }
        });
        
        // Chat input handlers
        document.addEventListener('keypress', (e) => {
            if (e.target.matches('#cqe-chat-input') && e.key === 'Enter') {
                sendChatMessage();
            }
            
            if (e.target.matches('#cqe-manual-asin') && e.key === 'Enter') {
                handleManualASINAdd();
            }
        });
    }
    
    // Conversation state management
    let conversationState = {
        step: 'WILLINGNESS_CHECK',
        productData: null,
        requirements: null,
        selectedAlternates: [],
        conversationHistory: []
    };
    
    // Conversation flow definition
    const CONVERSATION_STEPS = {
        WILLINGNESS_CHECK: {
            message: "Would you be willing to accept alternate ASINs for this request? This can help you get better pricing and availability options.",
            responses: ["Yes", "No"],
            nextStep: {
                "Yes": "REQUIREMENTS_GATHERING",
                "No": "END_CONVERSATION"
            }
        },
        
        REQUIREMENTS_GATHERING: {
            message: "Great! What are the key attributes a suitable alternate needs to meet to be suitable for you? For example: specific technical specifications, price range, brand preferences, or use case requirements.",
            type: "free_text",
            nextStep: "PROCESS_REQUIREMENTS"
        },
        
        PROCESS_REQUIREMENTS: {
            message: "Thank you for that information. Let me process your requirements and search for suitable alternates...",
            nextStep: "PRESENT_ALTERNATES"
        },
        
        PRESENT_ALTERNATES: {
            message: "Based on your requirements, I found these potential alternates. Please select the ones that would work for you:",
            type: "selection",
            nextStep: "MANUAL_ADDITION"
        },
        
        MANUAL_ADDITION: {
            message: "You can also add specific ASINs manually if you have alternates in mind:",
            type: "manual_input",
            nextStep: "SUMMARY_GENERATION"
        },
        
        SUMMARY_GENERATION: {
            message: "I'll now create a summary of your requirements to share with suppliers. This will help them understand what you're looking for.",
            nextStep: "END_CONVERSATION"
        },
        
        END_CONVERSATION: {
            message: "Thank you! Your alternate preferences have been recorded.",
            nextStep: null
        }
    };
    
    // Add message to chat
    function addChatMessage(message, isUser = false) {
        const messagesContainer = document.querySelector('#cqe-chat-messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user' : 'assistant'}`;
        
        const sender = isUser ? 'You' : 'Assistant';
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Store in conversation history
        conversationState.conversationHistory.push({
            message: message,
            isUser: isUser,
            timestamp: new Date().toISOString()
        });
        
        log(`Chat message added (${sender}):`, message);
    }
    
    // Process user input based on current conversation step
    function processUserInput(userInput) {
        const currentStep = CONVERSATION_STEPS[conversationState.step];
        
        if (!currentStep) {
            log('Error: Invalid conversation step:', conversationState.step);
            return;
        }
        
        // Add user message to chat
        addChatMessage(userInput, true);
        
        // Process based on step type
        switch (conversationState.step) {
            case 'WILLINGNESS_CHECK':
                handleWillingnessResponse(userInput);
                break;
                
            case 'REQUIREMENTS_GATHERING':
                handleRequirementsInput(userInput);
                break;
                
            case 'PROCESS_REQUIREMENTS':
                // This step is automatic, shouldn't receive user input
                break;
                
            default:
                // For other steps, just advance to next step
                advanceConversation();
                break;
        }
    }
    
    // Handle willingness check response
    function handleWillingnessResponse(response) {
        const normalizedResponse = response.toLowerCase().trim();
        
        if (normalizedResponse.includes('yes') || normalizedResponse.includes('y')) {
            conversationState.step = 'REQUIREMENTS_GATHERING';
            addChatMessage(CONVERSATION_STEPS.REQUIREMENTS_GATHERING.message);
        } else if (normalizedResponse.includes('no') || normalizedResponse.includes('n')) {
            conversationState.step = 'END_CONVERSATION';
            addChatMessage("I understand. You can still manually add specific ASINs if you change your mind.");
            showManualASINSection();
        } else {
            // Ask for clarification
            addChatMessage("I didn't quite understand. Could you please answer with 'Yes' or 'No'?");
        }
    }
    
    // Handle requirements gathering input
    function handleRequirementsInput(requirements) {
        const validation = INPUT_HANDLERS.validateRequirements(requirements);
        
        if (!validation.valid) {
            addChatMessage(validation.error, false);
            return;
        }
        
        const sanitizedRequirements = validation.requirements;
        const keywords = INPUT_HANDLERS.extractKeywords(sanitizedRequirements);
        
        conversationState.requirements = {
            text: sanitizedRequirements,
            keywords: keywords,
            processedAt: new Date().toISOString()
        };
        
        conversationState.step = 'PROCESS_REQUIREMENTS';
        
        // Provide feedback on extracted keywords
        let keywordFeedback = '';
        if (keywords.length > 0) {
            keywordFeedback = ` I noticed you're particularly interested in: ${keywords.join(', ')}.`;
        }
        
        addChatMessage(`Thank you for that information.${keywordFeedback} Let me process your requirements and search for suitable alternates...`);
        
        // Simulate processing delay
        setTimeout(() => {
            processRequirements(conversationState.requirements);
        }, 2000);
    }
    
    // Process requirements (placeholder for LLM integration)
    function processRequirements(requirements) {
        log('Processing requirements:', requirements);
        
        // TODO: Integrate with LLM service in Phase 3
        // For now, simulate finding alternates
        conversationState.step = 'PRESENT_ALTERNATES';
        
        addChatMessage("I found several potential alternates based on your requirements. However, the product search integration is not yet implemented. For now, you can add specific ASINs manually below.");
        
        showManualASINSection();
        showAlternatesSelection();
    }
    
    // Show manual ASIN input section
    function showManualASINSection() {
        const section = document.querySelector('#cqe-manual-asin-section');
        if (section) {
            section.style.display = 'block';
            log('Manual ASIN section shown');
        }
    }
    
    // Show alternates selection section
    function showAlternatesSelection() {
        const section = document.querySelector('#cqe-alternates-selection');
        if (section) {
            section.style.display = 'block';
            log('Alternates selection section shown');
        }
    }
    
    // ASIN validation utilities
    const ASIN_VALIDATION = {
        // Standard ASIN regex pattern
        REGEX: /^([0-9]{9}[0-9X]|[A-Z][A-Z0-9]{9})$/,
        
        // Validate ASIN format
        validate: function(asin) {
            if (!asin || typeof asin !== 'string') {
                return { 
                    valid: false, 
                    error: "ASIN is required and must be a string" 
                };
            }
            
            // Remove whitespace and convert to uppercase
            const cleanASIN = asin.trim().toUpperCase();
            
            if (cleanASIN.length !== 10) {
                return { 
                    valid: false, 
                    error: "ASIN must be exactly 10 characters long" 
                };
            }
            
            if (!this.REGEX.test(cleanASIN)) {
                return { 
                    valid: false, 
                    error: "Invalid ASIN format. Must be 10 digits (last can be X) or start with letter followed by 9 alphanumeric characters" 
                };
            }
            
            return { 
                valid: true, 
                asin: cleanASIN 
            };
        },
        
        // Extract ASIN from various input formats
        extract: function(input) {
            if (!input || typeof input !== 'string') {
                return null;
            }
            
            const cleanInput = input.trim();
            
            // Direct ASIN
            if (cleanInput.length === 10) {
                const validation = this.validate(cleanInput);
                return validation.valid ? validation.asin : null;
            }
            
            // Amazon URL patterns
            const urlPatterns = [
                /\/dp\/([A-Z0-9]{10})/i,
                /\/gp\/product\/([A-Z0-9]{10})/i,
                /asin=([A-Z0-9]{10})/i,
                /\/([A-Z0-9]{10})(?:\/|\?|$)/i
            ];
            
            for (const pattern of urlPatterns) {
                const match = cleanInput.match(pattern);
                if (match && match[1]) {
                    const validation = this.validate(match[1]);
                    if (validation.valid) {
                        return validation.asin;
                    }
                }
            }
            
            return null;
        },
        
        // Format ASIN for display
        format: function(asin) {
            const validation = this.validate(asin);
            return validation.valid ? validation.asin : asin;
        }
    };
    
    // Enhanced input handling utilities
    const INPUT_HANDLERS = {
        // Sanitize user input
        sanitize: function(input) {
            if (!input || typeof input !== 'string') {
                return '';
            }
            
            return input
                .trim()
                .replace(/[<>]/g, '') // Remove potential HTML tags
                .substring(0, 1000); // Limit length
        },
        
        // Validate requirements input
        validateRequirements: function(requirements) {
            const sanitized = this.sanitize(requirements);
            
            if (!sanitized) {
                return {
                    valid: false,
                    error: "Please provide some requirements for the alternate products."
                };
            }
            
            if (sanitized.length < 10) {
                return {
                    valid: false,
                    error: "Please provide more detailed requirements (at least 10 characters)."
                };
            }
            
            return {
                valid: true,
                requirements: sanitized
            };
        },
        
        // Extract key information from requirements
        extractKeywords: function(requirements) {
            if (!requirements) return [];
            
            const text = requirements.toLowerCase();
            const keywords = [];
            
            // Price-related keywords
            if (text.includes('price') || text.includes('cost') || text.includes('budget') || text.includes('cheap') || text.includes('expensive')) {
                keywords.push('price-sensitive');
            }
            
            // Brand-related keywords
            const brandMatches = text.match(/\b(brand|manufacturer|made by|from)\b/g);
            if (brandMatches) {
                keywords.push('brand-specific');
            }
            
            // Technical specifications
            if (text.includes('spec') || text.includes('technical') || text.includes('performance') || text.includes('feature')) {
                keywords.push('technical-specs');
            }
            
            // Quality-related
            if (text.includes('quality') || text.includes('durable') || text.includes('reliable')) {
                keywords.push('quality-focused');
            }
            
            // Use case related
            if (text.includes('use') || text.includes('purpose') || text.includes('application')) {
                keywords.push('use-case-specific');
            }
            
            return keywords;
        }
    };
    
    // Enhanced manual ASIN handling
    function handleManualASINAdd() {
        const asinInput = document.querySelector('#cqe-manual-asin');
        if (!asinInput) return;
        
        const rawInput = asinInput.value.trim();
        
        if (!rawInput) {
            showInputError(asinInput, "Please enter an ASIN or Amazon URL.");
            return;
        }
        
        // Try to extract ASIN from input
        const extractedASIN = ASIN_VALIDATION.extract(rawInput);
        
        if (!extractedASIN) {
            showInputError(asinInput, "Invalid ASIN format. Please enter a valid 10-character ASIN or Amazon product URL.");
            return;
        }
        
        // Check if already added
        if (conversationState.selectedAlternates.some(alt => alt.asin === extractedASIN)) {
            showInputError(asinInput, "This ASIN has already been added.");
            return;
        }
        
        // Clear any previous errors
        clearInputError(asinInput);
        
        // Add to selected alternates
        const alternate = {
            asin: extractedASIN,
            source: 'manual',
            name: `Manual Entry: ${extractedASIN}`,
            selected: true,
            addedAt: new Date().toISOString()
        };
        
        conversationState.selectedAlternates.push(alternate);
        
        // Update UI
        updateManualASINsList();
        updateConfirmButton();
        
        // Clear input
        asinInput.value = '';
        
        addChatMessage(`Added ASIN ${extractedASIN} to your alternates list.`, false);
        log('Manual ASIN added:', alternate);
    }
    
    // Show input error
    function showInputError(inputElement, message) {
        // Remove existing error
        clearInputError(inputElement);
        
        // Add error styling
        inputElement.style.borderColor = '#d93025';
        inputElement.style.backgroundColor = '#fef7f0';
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error-message';
        errorDiv.style.cssText = `
            color: #d93025;
            font-size: 0.8rem;
            margin-top: 0.25rem;
            padding: 0.25rem;
            background: #fef7f0;
            border-radius: 4px;
            border-left: 3px solid #d93025;
        `;
        errorDiv.textContent = message;
        
        // Insert after input
        inputElement.parentNode.insertBefore(errorDiv, inputElement.nextSibling);
        
        // Auto-clear error after 5 seconds
        setTimeout(() => {
            clearInputError(inputElement);
        }, 5000);
    }
    
    // Clear input error
    function clearInputError(inputElement) {
        // Reset input styling
        inputElement.style.borderColor = '';
        inputElement.style.backgroundColor = '';
        
        // Remove error message
        const errorMsg = inputElement.parentNode.querySelector('.input-error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }
    
    // Enhanced requirements handling
    function handleRequirementsInput(requirements) {
        const validation = INPUT_HANDLERS.validateRequirements(requirements);
        
        if (!validation.valid) {
            addChatMessage(validation.error, false);
            return;
        }
        
        const sanitizedRequirements = validation.requirements;
        const keywords = INPUT_HANDLERS.extractKeywords(sanitizedRequirements);
        
        conversationState.requirements = {
            text: sanitizedRequirements,
            keywords: keywords,
            processedAt: new Date().toISOString()
        };
        
        conversationState.step = 'PROCESS_REQUIREMENTS';
        
        // Provide feedback on extracted keywords
        let keywordFeedback = '';
        if (keywords.length > 0) {
            keywordFeedback = ` I noticed you're particularly interested in: ${keywords.join(', ')}.`;
        }
        
        addChatMessage(`Thank you for that information.${keywordFeedback} Let me process your requirements and search for suitable alternates...`);
        
        // Simulate processing delay
        setTimeout(() => {
            processRequirements(conversationState.requirements);
        }, 2000);
    }
    
    // Update manual ASINs list display
    function updateManualASINsList() {
        const listContainer = document.querySelector('#cqe-manual-asins-list');
        if (!listContainer) return;
        
        const manualASINs = conversationState.selectedAlternates.filter(alt => alt.source === 'manual');
        
        if (manualASINs.length === 0) {
            listContainer.innerHTML = '';
            return;
        }
        
        const listHtml = manualASINs.map(alt => `
            <div class="manual-asin-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: #f8f9fa; margin: 0.25rem 0; border-radius: 4px;">
                <span><strong>${alt.asin}</strong></span>
                <button class="remove-asin-btn b-button b-outline" data-asin="${alt.asin}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Remove</button>
            </div>
        `).join('');
        
        listContainer.innerHTML = listHtml;
        
        // Add remove handlers
        listContainer.querySelectorAll('.remove-asin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const asinToRemove = e.target.getAttribute('data-asin');
                removeManualASIN(asinToRemove);
            });
        });
    }
    
    // Remove manual ASIN
    function removeManualASIN(asin) {
        conversationState.selectedAlternates = conversationState.selectedAlternates.filter(alt => alt.asin !== asin);
        updateManualASINsList();
        updateConfirmButton();
        addChatMessage(`Removed ASIN ${asin} from your alternates list.`, false);
        log('Manual ASIN removed:', asin);
    }
    
    // Update confirm button state
    function updateConfirmButton() {
        const confirmBtn = document.querySelector('#cqe-confirm-alternates');
        if (!confirmBtn) return;
        
        const hasAlternates = conversationState.selectedAlternates.length > 0;
        confirmBtn.disabled = !hasAlternates;
        
        if (hasAlternates) {
            confirmBtn.textContent = `Add ${conversationState.selectedAlternates.length} Alternate${conversationState.selectedAlternates.length > 1 ? 's' : ''}`;
        } else {
            confirmBtn.textContent = 'Add Selected Alternates';
        }
    }
    
    // Send chat message
    function sendChatMessage() {
        const chatInput = document.querySelector('#cqe-chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Clear input
        chatInput.value = '';
        
        // Process the message
        processUserInput(message);
    }
    
    // Reset conversation state
    function resetConversationState(productData) {
        conversationState = {
            step: 'WILLINGNESS_CHECK',
            productData: productData,
            requirements: null,
            selectedAlternates: [],
            conversationHistory: []
        };
        
        // Clear chat messages except initial one
        const messagesContainer = document.querySelector('#cqe-chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="chat-message assistant">
                    <strong>Assistant:</strong> I'll help you find suitable alternate products. Let me start by asking: would you be willing to accept alternate ASINs for this request? This can help you get better pricing and availability options.
                </div>
            `;
        }
        
        // Hide sections
        const manualSection = document.querySelector('#cqe-manual-asin-section');
        const alternatesSection = document.querySelector('#cqe-alternates-selection');
        if (manualSection) manualSection.style.display = 'none';
        if (alternatesSection) alternatesSection.style.display = 'none';
        
        // Reset confirm button
        updateConfirmButton();
        
        log('Conversation state reset for product:', productData);
    }
    
    // Handle confirm alternates button
    function handleConfirmAlternates() {
        if (conversationState.selectedAlternates.length === 0) {
            addChatMessage("No alternates selected. Please add some ASINs first.", false);
            return;
        }
        
        log('Confirming alternates:', conversationState.selectedAlternates);
        
        // TODO: Integrate with CQE API in Phase 5
        // For now, just show success message
        addChatMessage(`Great! I've recorded ${conversationState.selectedAlternates.length} alternate ASIN${conversationState.selectedAlternates.length > 1 ? 's' : ''} for your request. This information will be shared with suppliers to help them provide better quotes.`, false);
        
        // Close modal after short delay
        setTimeout(() => {
            closeModal();
        }, 2000);
    }
    
    // Open modal with product context
    function openModal(productData) {
        let modal = document.querySelector('#cqe-alternates-modal');
        
        // Create modal if it doesn't exist
        if (!modal) {
            modal = createModal();
        }
        
        // Reset conversation state
        resetConversationState(productData);
        
        // Update product context
        const contextDiv = document.querySelector('#cqe-product-context');
        if (contextDiv && productData) {
            contextDiv.innerHTML = `
                <strong>Product:</strong> ${productData.name}<br>
                <strong>ASIN:</strong> ${productData.asin}<br>
                <strong>Quantity:</strong> ${productData.quantity}<br>
                <strong>Current Price:</strong> $${productData.unitPrice}/unit
            `;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus on chat input
        setTimeout(() => {
            const chatInput = document.querySelector('#cqe-chat-input');
            if (chatInput) {
                chatInput.focus();
            }
        }, 100);
        
        log('Modal opened for product:', productData);
    }
    
    // Close modal
    function closeModal() {
        const modal = document.querySelector('#cqe-alternates-modal');
        if (modal) {
            modal.style.display = 'none';
            log('Modal closed');
        }
    }
    
    // Handle "Add Alternates" button click
    function handleAddAlternatesClick(event) {
        event.preventDefault();
        
        const productKey = event.target.getAttribute('data-product-key');
        const rowElement = document.querySelector(`tr[data-key="${productKey}"]`);
        
        if (!rowElement) {
            log('Error: Could not find product row for key:', productKey);
            return;
        }
        
        const productData = extractProductData(rowElement);
        if (!productData) {
            log('Error: Could not extract product data');
            return;
        }
        
        log('Add Alternates clicked for product:', productData);
        
        // Open modal interface
        openModal(productData);
    }
    
    // Add "Add Alternates" option to dropdown menus
    function addAlternatesButtons() {
        const productRows = document.querySelectorAll(CQE_SELECTORS.productRows);
        log(`Found ${productRows.length} product rows`);
        
        productRows.forEach((row, index) => {
            const dropdown = row.querySelector(CQE_SELECTORS.dropdownMenus);
            if (!dropdown) {
                log(`No dropdown found for row ${index}`);
                return;
            }
            
            // Check if already added
            const existingButton = dropdown.querySelector('#add-alternates-option');
            if (existingButton) {
                log(`Alternates button already exists for row ${index}`);
                return;
            }
            
            // Create new menu item
            const alternatesItem = document.createElement('li');
            alternatesItem.setAttribute('role', 'presentation');
            
            const productKey = row.getAttribute('data-key');
            alternatesItem.innerHTML = `
                <a id="add-alternates-option-${productKey}" 
                   role="menuitem" 
                   tabindex="-1" 
                   class="b-clickable"
                   data-product-key="${productKey}"
                   href="#"
                   style="display: block; padding: 8px 12px; text-decoration: none; color: inherit;">
                  Add Alternates
                </a>
            `;
            
            // Add click handler
            const link = alternatesItem.querySelector('a');
            link.addEventListener('click', handleAddAlternatesClick);
            
            // Insert as first option (before Delete)
            dropdown.insertBefore(alternatesItem, dropdown.firstChild);
            
            log(`Added "Add Alternates" button to row ${index}`);
        });
    }
    
    // Initialize the enhancement
    function initialize() {
        log('Initializing CQE Alternates Enhancement...');
        
        if (!isCQEQuotePage()) {
            log('Not on CQE quote page, skipping initialization');
            return;
        }
        
        // Wait for page to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
            return;
        }
        
        // Add buttons to existing products
        addAlternatesButtons();
        
        // Watch for new products being added
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if new product rows were added
                            if (node.matches && node.matches(CQE_SELECTORS.productRows)) {
                                shouldUpdate = true;
                            }
                            // Or if the table was updated
                            if (node.querySelector && node.querySelector(CQE_SELECTORS.productRows)) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldUpdate) {
                log('New products detected, updating buttons...');
                setTimeout(addAlternatesButtons, 100); // Small delay to ensure DOM is ready
            }
        });
        
        // Start observing
        const tableContainer = document.querySelector(CQE_SELECTORS.productTable);
        if (tableContainer) {
            observer.observe(tableContainer, {
                childList: true,
                subtree: true
            });
            log('Started observing for new products');
        }
        
        log('CQE Alternates Enhancement initialized successfully');
    }
    
    // Start initialization
    initialize();
    
})();
