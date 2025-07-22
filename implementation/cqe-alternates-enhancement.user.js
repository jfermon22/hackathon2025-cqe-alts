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
            log('Extracting data for row key:', rowKey);
            
            // Try multiple methods to get ASIN
            let asin = '';
            
            // Method 1: From the main ASIN input field
            const asinInput = document.querySelector(CQE_SELECTORS.asinInput);
            if (asinInput && asinInput.value) {
                asin = asinInput.value.trim();
                log('ASIN from input field:', asin);
            }
            
            // Method 2: From data attributes on the row
            if (!asin) {
                const dataAttrs = Array.from(rowElement.attributes)
                    .filter(attr => attr.name.includes('asin') || attr.name.includes('product'))
                    .map(attr => ({ name: attr.name, value: attr.value }));
                log('Row data attributes:', dataAttrs);
                
                // Check for ASIN in data attributes
                for (const attr of dataAttrs) {
                    const extractedASIN = ASIN_VALIDATION.extract(attr.value);
                    if (extractedASIN) {
                        asin = extractedASIN;
                        log('ASIN from data attribute:', attr.name, '=', extractedASIN);
                        break;
                    }
                }
            }
            
            // Method 3: From links or images in the row
            if (!asin) {
                const links = rowElement.querySelectorAll('a[href]');
                for (const link of links) {
                    const extractedASIN = ASIN_VALIDATION.extract(link.href);
                    if (extractedASIN) {
                        asin = extractedASIN;
                        log('ASIN from link href:', extractedASIN);
                        break;
                    }
                }
            }
            
            // Method 4: From image src
            if (!asin) {
                const img = rowElement.querySelector('img[src]');
                if (img && img.src) {
                    const extractedASIN = ASIN_VALIDATION.extract(img.src);
                    if (extractedASIN) {
                        asin = extractedASIN;
                        log('ASIN from image src:', extractedASIN);
                    }
                }
            }
            
            // Method 5: From text content (last resort)
            if (!asin) {
                const textContent = rowElement.textContent;
                const asinMatch = textContent.match(/\b[A-Z0-9]{10}\b/g);
                if (asinMatch) {
                    for (const match of asinMatch) {
                        const validation = ASIN_VALIDATION.validate(match);
                        if (validation.valid) {
                            asin = validation.asin;
                            log('ASIN from text content:', asin);
                            break;
                        }
                    }
                }
            }
            
            // Get product name with multiple fallbacks
            let productName = '';
            const nameSelectors = [
                '.ink_typography_1lzltdc5',
                '.ink_typography_1lzltdc8',
                '.ink_typography_1lzltdcb',
                '[data-testid*="product"]',
                'h3',
                'h4',
                '.product-title',
                '.item-name'
            ];
            
            for (const selector of nameSelectors) {
                const nameElement = rowElement.querySelector(selector);
                if (nameElement && nameElement.textContent.trim()) {
                    productName = nameElement.textContent.trim();
                    log('Product name from selector', selector, ':', productName);
                    break;
                }
            }
            
            // Get quantity with multiple fallbacks
            let quantity = '';
            const quantitySelectors = [
                '.product-quantity',
                'input[type="number"]',
                'input[id*="quantity"]',
                '[data-testid*="quantity"]'
            ];
            
            for (const selector of quantitySelectors) {
                const qtyElement = rowElement.querySelector(selector);
                if (qtyElement) {
                    quantity = qtyElement.value || qtyElement.textContent.trim();
                    if (quantity) {
                        log('Quantity from selector', selector, ':', quantity);
                        break;
                    }
                }
            }
            
            const productData = {
                id: rowKey,
                asin: asin,
                name: productName || 'Unknown Product',
                image: rowElement.querySelector('img')?.src || '',
                quantity: quantity || '1',
                totalPrice: rowElement.querySelector('[data-inclusive-price]')?.getAttribute('data-inclusive-price') || '',
                unitPrice: rowElement.querySelector('[data-inclusive-unit-price]')?.getAttribute('data-inclusive-unit-price') || '',
                seller: rowElement.querySelector('.seller-performance-link')?.textContent?.trim() || '',
                merchantName: rowElement.querySelector('[data-merchant-name]')?.getAttribute('data-merchant-name') || ''
            };
            
            log('Final extracted product data:', productData);
            
            // Warn if critical data is missing
            if (!productData.asin) {
                log('WARNING: No ASIN found for product row');
                console.warn('CQE Alternates: No ASIN detected. Row HTML:', rowElement.outerHTML.substring(0, 500) + '...');
            }
            
            if (!productData.name || productData.name === 'Unknown Product') {
                log('WARNING: No product name found');
            }
            
            return productData;
        } catch (error) {
            log('Error extracting product data:', error);
            console.error('CQE Alternates: Product data extraction failed:', error);
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
    
    // Enhanced conversation flow definition with context awareness
    const ENHANCED_CONVERSATION_STEPS = {
        WILLINGNESS_CHECK: {
            message: "I can help you find alternate products that might offer better pricing or availability. Would you like me to suggest alternates for this ASIN?",
            responses: ["Yes", "No", "Maybe"],
            nextStep: {
                "Yes": "DETERMINE_APPROACH",
                "No": "OFFER_MANUAL_ONLY", 
                "Maybe": "EXPLAIN_BENEFITS"
            }
        },
        
        EXPLAIN_BENEFITS: {
            message: "Here's how alternates can help: suppliers often provide better pricing for equivalent products, you get more options if your primary choice is out of stock, and you can compare features across similar items. Would you like to proceed?",
            responses: ["Yes", "No"],
            nextStep: {
                "Yes": "DETERMINE_APPROACH",
                "No": "OFFER_MANUAL_ONLY"
            }
        },
        
        DETERMINE_APPROACH: {
            message: "I can help in two ways: 1) Ask you questions to understand your needs and suggest alternates, or 2) Let you add specific ASINs you already have in mind. Which would you prefer?",
            responses: ["Ask me questions", "I'll add specific ASINs", "Both"],
            nextStep: {
                "Ask me questions": "REQUIREMENTS_GATHERING",
                "I'll add specific ASINs": "MANUAL_ADDITION_ONLY",
                "Both": "REQUIREMENTS_GATHERING"
            }
        },
        
        REQUIREMENTS_GATHERING: {
            message: "Great! To find the best alternates, I need to understand what's important to you. Please tell me about:",
            subQuestions: [
                "What will you use this product for?",
                "Are there specific features that are must-haves?", 
                "Do you have a preferred price range?",
                "Any brand preferences or brands to avoid?",
                "Are there technical specifications that matter?"
            ],
            type: "guided_questions",
            nextStep: "PROCESS_REQUIREMENTS"
        },
        
        PROCESS_REQUIREMENTS: {
            message: "Thank you for that detailed information. Let me analyze your requirements and search for suitable alternates...",
            nextStep: "PRESENT_ALTERNATES"
        },
        
        PRESENT_ALTERNATES: {
            message: "Based on your requirements, I found several potential alternates. I'll show you the most relevant ones:",
            type: "selection_with_reasoning",
            nextStep: "REFINE_SELECTION"
        },
        
        REFINE_SELECTION: {
            message: "Would you like me to find more alternates, or are you satisfied with these options?",
            responses: ["Find more", "These are good", "Show me different types"],
            nextStep: {
                "Find more": "EXPAND_SEARCH",
                "These are good": "MANUAL_ADDITION",
                "Show me different types": "ALTERNATIVE_CATEGORIES"
            }
        },
        
        EXPAND_SEARCH: {
            message: "I'll search for additional alternates with broader criteria...",
            nextStep: "PRESENT_ALTERNATES"
        },
        
        ALTERNATIVE_CATEGORIES: {
            message: "Let me show you alternates from different categories or with different approaches to solving your need...",
            nextStep: "PRESENT_ALTERNATES"
        },
        
        MANUAL_ADDITION: {
            message: "You can also add any specific ASINs you have in mind using the manual input below:",
            type: "manual_input",
            nextStep: "SUMMARY_GENERATION"
        },
        
        MANUAL_ADDITION_ONLY: {
            message: "Perfect! You can add specific ASINs using the input below. I'll validate each one and help organize your list:",
            type: "manual_input_focused",
            nextStep: "SUMMARY_GENERATION"
        },
        
        OFFER_MANUAL_ONLY: {
            message: "No problem! If you change your mind, you can still add specific alternate ASINs manually using the input below:",
            type: "manual_only",
            nextStep: "END_CONVERSATION"
        },
        
        SUMMARY_GENERATION: {
            message: "Let me create a summary of your alternate preferences to share with suppliers...",
            nextStep: "PRESENT_SUMMARY"
        },
        
        PRESENT_SUMMARY: {
            message: "Here's what I'll share with suppliers about your alternate preferences:",
            type: "summary_display",
            nextStep: "CONFIRM_SUBMISSION"
        },
        
        CONFIRM_SUBMISSION: {
            message: "Does this summary look good? I'll include it with your quote request to help suppliers provide better options.",
            responses: ["Yes, looks good", "Let me modify something", "Start over"],
            nextStep: {
                "Yes, looks good": "END_CONVERSATION",
                "Let me modify something": "MODIFY_SUMMARY",
                "Start over": "WILLINGNESS_CHECK"
            }
        },
        
        MODIFY_SUMMARY: {
            message: "What would you like to change about the summary?",
            type: "free_text",
            nextStep: "SUMMARY_GENERATION"
        },
        
        END_CONVERSATION: {
            message: "Perfect! Your alternate preferences have been recorded and will be included in your quote request.",
            nextStep: null
        }
    };
    
    // Enhanced conversation state with more detailed tracking
    let enhancedConversationState = {
        step: 'WILLINGNESS_CHECK',
        productData: null,
        approach: null, // 'guided', 'manual', 'both'
        requirements: {
            useCase: '',
            mustHaveFeatures: [],
            priceRange: null,
            brandPreferences: [],
            brandExclusions: [],
            technicalSpecs: [],
            keywords: []
        },
        currentQuestion: 0,
        selectedAlternates: [],
        suggestedAlternates: [],
        conversationHistory: [],
        userPreferences: {
            responseStyle: 'detailed', // 'brief', 'detailed'
            searchDepth: 'standard' // 'quick', 'standard', 'thorough'
        }
    };
    
    // Enhanced conversation processing with context awareness
    function processEnhancedUserInput(userInput) {
        const currentStep = ENHANCED_CONVERSATION_STEPS[enhancedConversationState.step];
        
        if (!currentStep) {
            log('Error: Invalid conversation step:', enhancedConversationState.step);
            return;
        }
        
        // Add user message to chat
        addChatMessage(userInput, true);
        
        // Process based on step type and context
        switch (enhancedConversationState.step) {
            case 'WILLINGNESS_CHECK':
                handleEnhancedWillingnessResponse(userInput);
                break;
                
            case 'EXPLAIN_BENEFITS':
                handleBenefitsResponse(userInput);
                break;
                
            case 'DETERMINE_APPROACH':
                handleApproachSelection(userInput);
                break;
                
            case 'REQUIREMENTS_GATHERING':
                handleGuidedRequirements(userInput);
                break;
                
            case 'REFINE_SELECTION':
                handleSelectionRefinement(userInput);
                break;
                
            case 'CONFIRM_SUBMISSION':
                handleSubmissionConfirmation(userInput);
                break;
                
            case 'MODIFY_SUMMARY':
                handleSummaryModification(userInput);
                break;
                
            default:
                // For other steps, use standard processing
                advanceEnhancedConversation();
                break;
        }
    }
    
    // Handle enhanced willingness check with more nuanced responses
    function handleEnhancedWillingnessResponse(response) {
        const normalizedResponse = response.toLowerCase().trim();
        
        if (normalizedResponse.includes('yes') || normalizedResponse.includes('sure') || normalizedResponse.includes('okay')) {
            enhancedConversationState.step = 'DETERMINE_APPROACH';
            addChatMessage(ENHANCED_CONVERSATION_STEPS.DETERMINE_APPROACH.message);
        } else if (normalizedResponse.includes('no') || normalizedResponse.includes('not interested')) {
            enhancedConversationState.step = 'OFFER_MANUAL_ONLY';
            addChatMessage(ENHANCED_CONVERSATION_STEPS.OFFER_MANUAL_ONLY.message);
            showManualASINSection();
        } else if (normalizedResponse.includes('maybe') || normalizedResponse.includes('not sure') || normalizedResponse.includes('tell me more')) {
            enhancedConversationState.step = 'EXPLAIN_BENEFITS';
            addChatMessage(ENHANCED_CONVERSATION_STEPS.EXPLAIN_BENEFITS.message);
        } else {
            // Ask for clarification with more options
            addChatMessage("I'd like to help you find the best alternates. You can say 'yes' if you'd like suggestions, 'no' if you prefer to add specific ASINs yourself, or 'maybe' if you'd like to know more about how alternates can help.");
        }
    }
    
    // Handle benefits explanation response
    function handleBenefitsResponse(response) {
        const normalizedResponse = response.toLowerCase().trim();
        
        if (normalizedResponse.includes('yes') || normalizedResponse.includes('proceed') || normalizedResponse.includes('okay')) {
            enhancedConversationState.step = 'DETERMINE_APPROACH';
            addChatMessage(ENHANCED_CONVERSATION_STEPS.DETERMINE_APPROACH.message);
        } else {
            enhancedConversationState.step = 'OFFER_MANUAL_ONLY';
            addChatMessage(ENHANCED_CONVERSATION_STEPS.OFFER_MANUAL_ONLY.message);
            showManualASINSection();
        }
    }
    
    // Handle approach selection (guided questions vs manual input)
    function handleApproachSelection(response) {
        const normalizedResponse = response.toLowerCase().trim();
        
        if (normalizedResponse.includes('question') || normalizedResponse.includes('ask me')) {
            enhancedConversationState.approach = 'guided';
            enhancedConversationState.step = 'REQUIREMENTS_GATHERING';
            startGuidedRequirements();
        } else if (normalizedResponse.includes('specific') || normalizedResponse.includes('add') || normalizedResponse.includes('asin')) {
            enhancedConversationState.approach = 'manual';
            enhancedConversationState.step = 'MANUAL_ADDITION_ONLY';
            addChatMessage(ENHANCED_CONVERSATION_STEPS.MANUAL_ADDITION_ONLY.message);
            showManualASINSection();
        } else if (normalizedResponse.includes('both')) {
            enhancedConversationState.approach = 'both';
            enhancedConversationState.step = 'REQUIREMENTS_GATHERING';
            startGuidedRequirements();
        } else {
            addChatMessage("Please choose one: 'Ask me questions' for guided suggestions, 'I'll add specific ASINs' for manual input, or 'Both' for a combination approach.");
        }
    }
    
    // Start guided requirements gathering
    function startGuidedRequirements() {
        enhancedConversationState.currentQuestion = 0;
        const questions = ENHANCED_CONVERSATION_STEPS.REQUIREMENTS_GATHERING.subQuestions;
        
        addChatMessage(`${ENHANCED_CONVERSATION_STEPS.REQUIREMENTS_GATHERING.message}\n\n**Question 1 of ${questions.length}:** ${questions[0]}`);
    }
    
    // Handle guided requirements gathering
    function handleGuidedRequirements(response) {
        const questions = ENHANCED_CONVERSATION_STEPS.REQUIREMENTS_GATHERING.subQuestions;
        const currentQ = enhancedConversationState.currentQuestion;
        
        // Store the response based on question type
        storeRequirementResponse(currentQ, response);
        
        // Move to next question or finish
        enhancedConversationState.currentQuestion++;
        
        if (enhancedConversationState.currentQuestion < questions.length) {
            const nextQ = enhancedConversationState.currentQuestion;
            addChatMessage(`**Question ${nextQ + 1} of ${questions.length}:** ${questions[nextQ]}`);
        } else {
            // All questions answered, process requirements
            enhancedConversationState.step = 'PROCESS_REQUIREMENTS';
            addChatMessage(ENHANCED_CONVERSATION_STEPS.PROCESS_REQUIREMENTS.message);
            
            setTimeout(() => {
                processEnhancedRequirements();
            }, 2000);
        }
    }
    
    // Store requirement responses in structured format
    function storeRequirementResponse(questionIndex, response) {
        const sanitizedResponse = INPUT_HANDLERS.sanitize(response);
        
        switch (questionIndex) {
            case 0: // Use case
                enhancedConversationState.requirements.useCase = sanitizedResponse;
                break;
            case 1: // Must-have features
                enhancedConversationState.requirements.mustHaveFeatures = extractFeatures(sanitizedResponse);
                break;
            case 2: // Price range
                enhancedConversationState.requirements.priceRange = extractPriceRange(sanitizedResponse);
                break;
            case 3: // Brand preferences
                const brands = extractBrands(sanitizedResponse);
                enhancedConversationState.requirements.brandPreferences = brands.preferred;
                enhancedConversationState.requirements.brandExclusions = brands.excluded;
                break;
            case 4: // Technical specs
                enhancedConversationState.requirements.technicalSpecs = extractTechnicalSpecs(sanitizedResponse);
                break;
        }
        
        // Extract keywords from all responses
        const keywords = INPUT_HANDLERS.extractKeywords(sanitizedResponse);
        enhancedConversationState.requirements.keywords = [
            ...enhancedConversationState.requirements.keywords,
            ...keywords
        ].filter((keyword, index, self) => self.indexOf(keyword) === index); // Remove duplicates
        
        log(`Stored requirement ${questionIndex}:`, sanitizedResponse);
    }
    
    // Extract features from user response
    function extractFeatures(response) {
        const features = [];
        const text = response.toLowerCase();
        
        // Common feature keywords
        const featureKeywords = [
            'waterproof', 'wireless', 'bluetooth', 'usb', 'rechargeable', 'portable',
            'durable', 'lightweight', 'compact', 'adjustable', 'automatic', 'manual',
            'digital', 'analog', 'led', 'lcd', 'touchscreen', 'voice control'
        ];
        
        featureKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                features.push(keyword);
            }
        });
        
        return features;
    }
    
    // Extract price range from user response
    function extractPriceRange(response) {
        const text = response.toLowerCase();
        const priceMatches = text.match(/\$?(\d+(?:\.\d{2})?)/g);
        
        if (priceMatches && priceMatches.length >= 2) {
            const prices = priceMatches.map(p => parseFloat(p.replace('$', '')));
            return {
                min: Math.min(...prices),
                max: Math.max(...prices)
            };
        } else if (priceMatches && priceMatches.length === 1) {
            const price = parseFloat(priceMatches[0].replace('$', ''));
            if (text.includes('under') || text.includes('less than') || text.includes('below')) {
                return { min: 0, max: price };
            } else if (text.includes('over') || text.includes('more than') || text.includes('above')) {
                return { min: price, max: null };
            }
        }
        
        return null;
    }
    
    // Extract brand information from user response
    function extractBrands(response) {
        const text = response.toLowerCase();
        const preferred = [];
        const excluded = [];
        
        // Common brand extraction patterns
        const brandPatterns = [
            /prefer\s+([a-z]+)/g,
            /like\s+([a-z]+)/g,
            /avoid\s+([a-z]+)/g,
            /not\s+([a-z]+)/g
        ];
        
        // This is a simplified version - in a real implementation,
        // you'd have a comprehensive brand database
        const commonBrands = ['3m', 'amazon', 'sony', 'apple', 'samsung', 'lg', 'hp', 'dell'];
        
        commonBrands.forEach(brand => {
            if (text.includes(brand)) {
                if (text.includes('avoid') || text.includes('not ' + brand) || text.includes('except ' + brand)) {
                    excluded.push(brand);
                } else {
                    preferred.push(brand);
                }
            }
        });
        
        return { preferred, excluded };
    }
    
    // Extract technical specifications
    function extractTechnicalSpecs(response) {
        const specs = [];
        const text = response.toLowerCase();
        
        // Common spec patterns
        const specPatterns = [
            /(\d+)\s*(gb|mb|tb)/g, // Storage
            /(\d+)\s*(mhz|ghz)/g, // Frequency
            /(\d+)\s*(inch|"|ft|cm|mm)/g, // Dimensions
            /(\d+)\s*(watt|w|volt|v|amp|a)/g, // Power
            /(\d+)\s*(dpi|ppi)/g // Resolution
        ];
        
        specPatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                specs.push(...matches);
            }
        });
        
        return specs;
    }
    
    // Process enhanced requirements with better analysis
    function processEnhancedRequirements() {
        log('Processing enhanced requirements:', enhancedConversationState.requirements);
        
        // Generate summary of requirements
        const reqSummary = generateRequirementsSummary();
        addChatMessage(`Based on your answers, I understand you're looking for:\n\n${reqSummary}\n\nLet me search for suitable alternates...`);
        
        // TODO: This will integrate with LLM service in Phase 3
        // For now, simulate finding alternates
        setTimeout(() => {
            enhancedConversationState.step = 'PRESENT_ALTERNATES';
            addChatMessage("I found several potential alternates based on your requirements. However, the product search integration is not yet implemented. For now, you can add specific ASINs manually below.");
            
            if (enhancedConversationState.approach === 'both' || enhancedConversationState.approach === 'guided') {
                showManualASINSection();
                showAlternatesSelection();
            }
        }, 2000);
    }
    
    // Generate human-readable requirements summary
    function generateRequirementsSummary() {
        const req = enhancedConversationState.requirements;
        const summary = [];
        
        if (req.useCase) {
            summary.push(`• **Use case**: ${req.useCase}`);
        }
        
        if (req.mustHaveFeatures.length > 0) {
            summary.push(`• **Must-have features**: ${req.mustHaveFeatures.join(', ')}`);
        }
        
        if (req.priceRange) {
            if (req.priceRange.max && req.priceRange.min > 0) {
                summary.push(`• **Price range**: $${req.priceRange.min} - $${req.priceRange.max}`);
            } else if (req.priceRange.max) {
                summary.push(`• **Price limit**: Under $${req.priceRange.max}`);
            } else if (req.priceRange.min) {
                summary.push(`• **Minimum price**: Over $${req.priceRange.min}`);
            }
        }
        
        if (req.brandPreferences.length > 0) {
            summary.push(`• **Preferred brands**: ${req.brandPreferences.join(', ')}`);
        }
        
        if (req.brandExclusions.length > 0) {
            summary.push(`• **Brands to avoid**: ${req.brandExclusions.join(', ')}`);
        }
        
        if (req.technicalSpecs.length > 0) {
            summary.push(`• **Technical requirements**: ${req.technicalSpecs.join(', ')}`);
        }
        
        return summary.length > 0 ? summary.join('\n') : 'General alternate products that serve a similar purpose';
    }
    
    // Advance conversation to next step
    function advanceEnhancedConversation() {
        const currentStep = ENHANCED_CONVERSATION_STEPS[enhancedConversationState.step];
        if (currentStep && currentStep.nextStep) {
            enhancedConversationState.step = currentStep.nextStep;
            const nextStep = ENHANCED_CONVERSATION_STEPS[enhancedConversationState.step];
            if (nextStep && nextStep.message) {
                addChatMessage(nextStep.message);
            }
        }
    }
    
    // Add message to chat (updated for enhanced state)
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
        
        // Store in enhanced conversation history
        enhancedConversationState.conversationHistory.push({
            message: message,
            isUser: isUser,
            timestamp: new Date().toISOString(),
            step: enhancedConversationState.step,
            questionIndex: enhancedConversationState.currentQuestion
        });
        
        log(`Chat message added (${sender}):`, message);
    }
    
    // Process user input based on current conversation step (updated for enhanced system)
    function processUserInput(userInput) {
        // Use enhanced conversation processing
        processEnhancedUserInput(userInput);
    }
    
    // Handle willingness check response (legacy - now uses enhanced version)
    function handleWillingnessResponse(response) {
        handleEnhancedWillingnessResponse(response);
    }
    
    // Handle requirements gathering input (updated for enhanced system)
    function handleRequirementsInput(requirements) {
        if (enhancedConversationState.step === 'REQUIREMENTS_GATHERING') {
            // Use guided requirements if in enhanced mode
            handleGuidedRequirements(requirements);
        } else {
            // Fallback to original simple requirements handling
            const validation = INPUT_HANDLERS.validateRequirements(requirements);
            
            if (!validation.valid) {
                addChatMessage(validation.error, false);
                return;
            }
            
            const sanitizedRequirements = validation.requirements;
            const keywords = INPUT_HANDLERS.extractKeywords(sanitizedRequirements);
            
            enhancedConversationState.requirements = {
                text: sanitizedRequirements,
                keywords: keywords,
                processedAt: new Date().toISOString()
            };
            
            enhancedConversationState.step = 'PROCESS_REQUIREMENTS';
            
            // Provide feedback on extracted keywords
            let keywordFeedback = '';
            if (keywords.length > 0) {
                keywordFeedback = ` I noticed you're particularly interested in: ${keywords.join(', ')}.`;
            }
            
            addChatMessage(`Thank you for that information.${keywordFeedback} Let me process your requirements and search for suitable alternates...`);
            
            // Simulate processing delay
            setTimeout(() => {
                processRequirements(enhancedConversationState.requirements);
            }, 2000);
        }
    }
    
    // Process requirements (updated to work with enhanced state)
    function processRequirements(requirements) {
        log('Processing requirements:', requirements);
        
        // TODO: Integrate with LLM service in Phase 3
        // For now, simulate finding alternates
        enhancedConversationState.step = 'PRESENT_ALTERNATES';
        
        addChatMessage("I found several potential alternates based on your requirements. However, the product search integration is not yet implemented. For now, you can add specific ASINs manually below.");
        
        showManualASINSection();
        showAlternatesSelection();
    }
    
    // Reset conversation state (updated for enhanced system)
    function resetConversationState(productData) {
        enhancedConversationState = {
            step: 'WILLINGNESS_CHECK',
            productData: productData,
            approach: null,
            requirements: {
                useCase: '',
                mustHaveFeatures: [],
                priceRange: null,
                brandPreferences: [],
                brandExclusions: [],
                technicalSpecs: [],
                keywords: []
            },
            currentQuestion: 0,
            selectedAlternates: [],
            suggestedAlternates: [],
            conversationHistory: [],
            userPreferences: {
                responseStyle: 'detailed',
                searchDepth: 'standard'
            }
        };
        
        // Clear chat messages except initial one
        const messagesContainer = document.querySelector('#cqe-chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="chat-message assistant">
                    <strong>Assistant:</strong> ${ENHANCED_CONVERSATION_STEPS.WILLINGNESS_CHECK.message}
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
        
        log('Enhanced conversation state reset for product:', productData);
    }
    
    // Update manual ASIN handling to work with enhanced state
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
        if (enhancedConversationState.selectedAlternates.some(alt => alt.asin === extractedASIN)) {
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
        
        enhancedConversationState.selectedAlternates.push(alternate);
        
        // Update UI
        updateManualASINsList();
        updateConfirmButton();
        
        // Clear input
        asinInput.value = '';
        
        addChatMessage(`Added ASIN ${extractedASIN} to your alternates list.`, false);
        log('Manual ASIN added:', alternate);
    }
    
    // Update manual ASINs list display (updated for enhanced state)
    function updateManualASINsList() {
        const listContainer = document.querySelector('#cqe-manual-asins-list');
        if (!listContainer) return;
        
        const manualASINs = enhancedConversationState.selectedAlternates.filter(alt => alt.source === 'manual');
        
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
    
    // Remove manual ASIN (updated for enhanced state)
    function removeManualASIN(asin) {
        enhancedConversationState.selectedAlternates = enhancedConversationState.selectedAlternates.filter(alt => alt.asin !== asin);
        updateManualASINsList();
        updateConfirmButton();
        addChatMessage(`Removed ASIN ${asin} from your alternates list.`, false);
        log('Manual ASIN removed:', asin);
    }
    
    // Update confirm button state (updated for enhanced state)
    function updateConfirmButton() {
        const confirmBtn = document.querySelector('#cqe-confirm-alternates');
        if (!confirmBtn) return;
        
        const hasAlternates = enhancedConversationState.selectedAlternates.length > 0;
        confirmBtn.disabled = !hasAlternates;
        
        if (hasAlternates) {
            confirmBtn.textContent = `Add ${enhancedConversationState.selectedAlternates.length} Alternate${enhancedConversationState.selectedAlternates.length > 1 ? 's' : ''}`;
        } else {
            confirmBtn.textContent = 'Add Selected Alternates';
        }
    }
    
    // Handle confirm alternates button (updated for enhanced state)
    function handleConfirmAlternates() {
        if (enhancedConversationState.selectedAlternates.length === 0) {
            addChatMessage("No alternates selected. Please add some ASINs first.", false);
            return;
        }
        
        log('Confirming alternates:', enhancedConversationState.selectedAlternates);
        
        // Generate summary if we have requirements
        let summaryMessage = `Great! I've recorded ${enhancedConversationState.selectedAlternates.length} alternate ASIN${enhancedConversationState.selectedAlternates.length > 1 ? 's' : ''} for your request.`;
        
        if (enhancedConversationState.requirements.useCase || enhancedConversationState.requirements.keywords.length > 0) {
            const reqSummary = generateRequirementsSummary();
            if (reqSummary !== 'General alternate products that serve a similar purpose') {
                summaryMessage += `\n\nYour requirements summary:\n${reqSummary}`;
            }
        }
        
        summaryMessage += "\n\nThis information will be shared with suppliers to help them provide better quotes.";
        
        addChatMessage(summaryMessage, false);
        
        // Close modal after short delay
        setTimeout(() => {
            closeModal();
        }, 3000);
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
    
    // Add "Add Alternates" button near the ASIN input form
    function addAlternatesButton() {
        const asinInput = document.querySelector(CQE_SELECTORS.asinInput);
        log('Looking for ASIN input:', CQE_SELECTORS.asinInput);
        
        if (!asinInput) {
            log('ASIN input not found. Checking alternative selectors...');
            
            // Try alternative selectors for ASIN input
            const alternativeSelectors = [
                '#add-asin-or-isbn-form',
                'input[placeholder*="ASIN"]',
                'input[placeholder*="ISBN"]',
                'input[id*="asin"]',
                'input[name*="asin"]'
            ];
            
            for (const selector of alternativeSelectors) {
                const altInput = document.querySelector(selector);
                if (altInput) {
                    log(`Found ASIN input with alternative selector: ${selector}`);
                    return addButtonNearInput(altInput);
                }
            }
            
            log('No ASIN input found with any selector');
            return;
        }
        
        log('ASIN input found:', asinInput);
        addButtonNearInput(asinInput);
    }
    
    // Add the button near the specified input element
    function addButtonNearInput(inputElement) {
        // Check if button already exists
        const existingButton = document.querySelector('#cqe-add-alternates-btn');
        if (existingButton) {
            log('Add Alternates button already exists');
            return;
        }
        
        // Find the container that holds the input and "Add Item" button
        let container = inputElement.closest('.b-flex');
        if (!container) {
            container = inputElement.closest('div');
        }
        
        if (!container) {
            log('Could not find suitable container for button placement');
            return;
        }
        
        log('Found container for button placement:', container);
        
        // Look for the "Add Item" button to place our button next to it
        const addItemButton = container.querySelector('#add-item-btn') || 
                             container.querySelector('button[type="submit"]') ||
                             document.querySelector('#add-item-btn');
        
        if (addItemButton) {
            log('Found Add Item button:', addItemButton);
            
            // Create our "Add Alternates" button
            const alternatesButton = document.createElement('button');
            alternatesButton.id = 'cqe-add-alternates-btn';
            alternatesButton.className = 'b-button b-outline';
            alternatesButton.type = 'button';
            alternatesButton.textContent = 'Add Alternates';
            alternatesButton.style.marginLeft = '0.5rem';
            
            // Add click handler
            alternatesButton.addEventListener('click', handleAddAlternatesClick);
            
            // Insert after the Add Item button
            addItemButton.parentNode.insertBefore(alternatesButton, addItemButton.nextSibling);
            
            log('Add Alternates button added next to Add Item button');
        } else {
            // Fallback: add button in the input container
            log('Add Item button not found, adding button to input container');
            
            const alternatesButton = document.createElement('button');
            alternatesButton.id = 'cqe-add-alternates-btn';
            alternatesButton.className = 'b-button b-outline';
            alternatesButton.type = 'button';
            alternatesButton.textContent = 'Add Alternates';
            alternatesButton.style.marginTop = '0.5rem';
            
            // Add click handler
            alternatesButton.addEventListener('click', handleAddAlternatesClick);
            
            // Add to container
            container.appendChild(alternatesButton);
            
            log('Add Alternates button added to input container');
        }
    }
    
    // Handle "Add Alternates" button click (updated for ASIN input approach)
    function handleAddAlternatesClick(event) {
        event.preventDefault();
        
        // Get ASIN from the input field
        const asinInput = document.querySelector(CQE_SELECTORS.asinInput) || 
                         document.querySelector('#add-asin-or-isbn-form');
        
        if (!asinInput) {
            log('Error: Could not find ASIN input field');
            alert('Could not find ASIN input field');
            return;
        }
        
        const asin = asinInput.value.trim();
        if (!asin) {
            log('Error: No ASIN entered');
            alert('Please enter an ASIN first');
            return;
        }
        
        // Validate ASIN
        const validation = ASIN_VALIDATION.validate(asin);
        if (!validation.valid) {
            log('Error: Invalid ASIN format:', validation.error);
            alert(`Invalid ASIN: ${validation.error}`);
            return;
        }
        
        // Get quantity from quantity input
        const quantityInput = document.querySelector('#item-quantity') || 
                             document.querySelector('input[type="number"]');
        const quantity = quantityInput ? quantityInput.value || '1' : '1';
        
        // Create product data object
        const productData = {
            id: `input-${Date.now()}`,
            asin: validation.asin,
            name: `Product ${validation.asin}`,
            image: '',
            quantity: quantity,
            totalPrice: '',
            unitPrice: '',
            seller: '',
            merchantName: '',
            source: 'asin-input'
        };
        
        log('Add Alternates clicked for ASIN input:', productData);
        
        // Open modal interface
        openModal(productData);
    }
    
    // Manual debug function - can be called from console
    window.debugCQEAlternates = function() {
        console.log('=== CQE Alternates Debug Info (ASIN Input Approach) ===');
        
        // Check page detection
        console.log('1. Page Detection:');
        console.log('   Header element:', document.querySelector(CQE_SELECTORS.pageHeader));
        console.log('   Breadcrumb element:', document.querySelector('.b-breadcrumb'));
        console.log('   Is CQE page:', isCQEQuotePage());
        
        // Check ASIN input (primary focus)
        console.log('2. ASIN Input:');
        const asinInput = document.querySelector(CQE_SELECTORS.asinInput);
        console.log('   ASIN input element:', asinInput);
        console.log('   ASIN input value:', asinInput?.value);
        console.log('   ASIN input parent:', asinInput?.parentElement);
        
        // Try alternative ASIN input selectors
        console.log('3. Alternative ASIN Input Selectors:');
        const altSelectors = [
            '#add-asin-or-isbn-form',
            'input[placeholder*="ASIN"]',
            'input[placeholder*="ISBN"]',
            'input[id*="asin"]',
            'input[name*="asin"]'
        ];
        
        altSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            console.log(`   ${selector}:`, element);
        });
        
        // Check for Add Item button
        console.log('4. Add Item Button:');
        const addItemBtn = document.querySelector('#add-item-btn');
        console.log('   Add Item button:', addItemBtn);
        console.log('   Add Item button parent:', addItemBtn?.parentElement);
        
        // Check for our button
        console.log('5. Our Add Alternates Button:');
        const ourButton = document.querySelector('#cqe-add-alternates-btn');
        console.log('   Add Alternates button:', ourButton);
        
        // Check quantity input
        console.log('6. Quantity Input:');
        const qtyInput = document.querySelector('#item-quantity');
        console.log('   Quantity input:', qtyInput);
        console.log('   Quantity value:', qtyInput?.value);
        
        // Show form structure
        console.log('7. Form Structure:');
        const formContainer = document.querySelector('.b-flex') || 
                             document.querySelector('form') ||
                             asinInput?.closest('div');
        console.log('   Form container:', formContainer);
        if (formContainer) {
            console.log('   Form container HTML:', formContainer.outerHTML.substring(0, 500) + '...');
        }
        
        console.log('=== End Debug Info ===');
        
        // Try to add button manually
        console.log('Attempting to add button...');
        addAlternatesButton();
    };
    
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
        
        // Add button near ASIN input
        addAlternatesButton();
        
        // Watch for changes to the form area in case it's dynamically loaded
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if ASIN input was added
                            if (node.matches && (
                                node.matches('#add-asin-or-isbn-form') ||
                                node.querySelector && node.querySelector('#add-asin-or-isbn-form')
                            )) {
                                shouldUpdate = true;
                            }
                            // Or if the form container was updated
                            if (node.querySelector && node.querySelector('input, button')) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldUpdate) {
                log('Form area updated, checking for button...');
                setTimeout(addAlternatesButton, 100); // Small delay to ensure DOM is ready
            }
        });
        
        // Start observing the main container
        const mainContainer = document.querySelector('.b-container') || document.body;
        if (mainContainer) {
            observer.observe(mainContainer, {
                childList: true,
                subtree: true
            });
            log('Started observing for form changes');
        }
        
        log('CQE Alternates Enhancement initialized successfully');
    }
    
    // Start initialization
    initialize();
    
})();
