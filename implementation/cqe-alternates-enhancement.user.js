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
                    
                    <div class="cqe-modal-body">
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
                
                /* Modal body - scrollable content area */
                .cqe-modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                    min-height: 0; /* Important for flex child to shrink */
                }
                
                /* Custom scrollbar styling */
                .cqe-modal-body::-webkit-scrollbar {
                    width: 8px;
                }
                
                .cqe-modal-body::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                
                .cqe-modal-body::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 4px;
                }
                
                .cqe-modal-body::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
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
                    display: flex;
                    flex-direction: column;
                    min-height: 300px;
                }
                
                .cqe-chat-messages {
                    flex: 1;
                    padding: 1rem;
                    overflow-y: auto;
                    max-height: 250px;
                    min-height: 200px;
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
    
    // Context-aware response generation system
    const CONTEXT_AWARE_RESPONSES = {
        // Product category detection patterns
        PRODUCT_CATEGORIES: {
            'electronics': ['electronic', 'device', 'gadget', 'tech', 'digital', 'smart', 'wireless', 'bluetooth'],
            'office_supplies': ['tape', 'paper', 'pen', 'stapler', 'folder', 'binder', 'office', 'desk'],
            'tools': ['tool', 'drill', 'hammer', 'wrench', 'screwdriver', 'saw', 'hardware'],
            'home_garden': ['garden', 'plant', 'seed', 'fertilizer', 'hose', 'pot', 'outdoor'],
            'clothing': ['shirt', 'pants', 'dress', 'shoe', 'jacket', 'clothing', 'apparel'],
            'books': ['book', 'novel', 'textbook', 'manual', 'guide', 'reference'],
            'health_beauty': ['cream', 'lotion', 'shampoo', 'vitamin', 'supplement', 'cosmetic'],
            'automotive': ['car', 'auto', 'vehicle', 'tire', 'oil', 'filter', 'brake'],
            'sports': ['sport', 'fitness', 'exercise', 'gym', 'athletic', 'outdoor', 'recreation']
        },
        
        // Context-specific question templates
        CONTEXTUAL_QUESTIONS: {
            'electronics': {
                useCase: "What will you primarily use this electronic device for? (e.g., work, entertainment, specific tasks)",
                features: "Are there specific technical features that are essential? (e.g., battery life, connectivity, performance specs)",
                compatibility: "Do you need it to be compatible with any existing devices or systems?"
            },
            'office_supplies': {
                useCase: "What's the intended use for this office supply? (e.g., daily office work, special projects, presentations)",
                features: "Are there specific qualities that matter most? (e.g., durability, adhesion strength, paper quality)",
                quantity: "Will you be using this frequently or for high-volume applications?"
            },
            'tools': {
                useCase: "What type of projects will you use this tool for? (e.g., professional work, DIY, repairs)",
                features: "What performance characteristics are most important? (e.g., power, precision, durability)",
                experience: "What's your experience level with similar tools? (affects complexity recommendations)"
            },
            'default': {
                useCase: "What will you use this product for?",
                features: "What features or qualities are most important to you?",
                preferences: "Do you have any specific preferences or requirements?"
            }
        },
        
        // Response templates based on context
        RESPONSE_TEMPLATES: {
            willingness: {
                'electronics': "I can help you find alternate electronic devices that might offer better value, newer features, or improved compatibility. Technology moves fast, so there might be newer models or different brands that better suit your needs.",
                'office_supplies': "Office supplies often have great alternatives with similar functionality but better pricing or bulk options. I can help you find equivalent products that work just as well for your office needs.",
                'tools': "Tools are an area where alternates can offer significant value - sometimes different brands provide the same functionality at better price points, or newer models with improved features.",
                'default': "I can help you find alternate products that might offer better pricing, availability, or features that better match your specific needs."
            },
            
            benefits: {
                'electronics': "For electronics, alternates can help you: get newer technology at similar prices, find products with better warranty coverage, discover brands with superior customer support, or find devices with features more suited to your specific use case.",
                'office_supplies': "Office supply alternates often provide: bulk pricing advantages, better quality materials, eco-friendly options, or products specifically designed for your type of work environment.",
                'tools': "Tool alternates can offer: professional-grade quality at consumer prices, better ergonomics for your specific tasks, improved safety features, or specialized versions for your particular applications.",
                'default': "Alternates can provide better value, improved features, higher quality, or better availability than your original choice."
            }
        }
    };
    
    // Detect product category from ASIN and product name
    function detectProductCategory(productData) {
        if (!productData || !productData.name) return 'default';
        
        const productText = productData.name.toLowerCase();
        
        for (const [category, keywords] of Object.entries(CONTEXT_AWARE_RESPONSES.PRODUCT_CATEGORIES)) {
            for (const keyword of keywords) {
                if (productText.includes(keyword)) {
                    log(`Detected product category: ${category} (keyword: ${keyword})`);
                    return category;
                }
            }
        }
        
        log('No specific category detected, using default');
        return 'default';
    }
    
    // Generate context-aware response based on product and conversation state
    function generateContextAwareResponse(responseType, productData = null) {
        const product = productData || enhancedConversationState.productData;
        const category = detectProductCategory(product);
        
        const templates = CONTEXT_AWARE_RESPONSES.RESPONSE_TEMPLATES[responseType];
        if (!templates) {
            log(`No templates found for response type: ${responseType}`);
            return null;
        }
        
        const response = templates[category] || templates['default'];
        
        // Personalize the response with product information
        if (product && product.name) {
            return response.replace(/this product/g, `this ${product.name.toLowerCase()}`);
        }
        
        return response;
    }
    
    // Generate contextual questions based on product category
    function generateContextualQuestions(productData) {
        const category = detectProductCategory(productData);
        const questions = CONTEXT_AWARE_RESPONSES.CONTEXTUAL_QUESTIONS[category] || 
                         CONTEXT_AWARE_RESPONSES.CONTEXTUAL_QUESTIONS['default'];
        
        // Convert questions object to array with context
        const contextualQuestions = [];
        
        if (questions.useCase) {
            contextualQuestions.push(questions.useCase);
        }
        
        if (questions.features) {
            contextualQuestions.push(questions.features);
        }
        
        if (questions.compatibility) {
            contextualQuestions.push(questions.compatibility);
        }
        
        if (questions.quantity) {
            contextualQuestions.push(questions.quantity);
        }
        
        if (questions.experience) {
            contextualQuestions.push(questions.experience);
        }
        
        if (questions.preferences) {
            contextualQuestions.push(questions.preferences);
        }
        
        // Add price question for all categories
        contextualQuestions.push("What's your target price range or budget for alternates?");
        
        // Add brand question for all categories
        contextualQuestions.push("Are there any brands you prefer or want to avoid?");
        
        log(`Generated ${contextualQuestions.length} contextual questions for category: ${category}`);
        return contextualQuestions;
    }
    
    // Enhanced willingness response with context awareness
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
            
            // Use context-aware benefits explanation
            const contextualBenefits = generateContextAwareResponse('benefits');
            const message = contextualBenefits || ENHANCED_CONVERSATION_STEPS.EXPLAIN_BENEFITS.message;
            
            addChatMessage(message);
        } else {
            // Use context-aware clarification
            const contextualWillingness = generateContextAwareResponse('willingness');
            const clarification = contextualWillingness ? 
                `${contextualWillingness} Would you like me to help find alternates?` :
                "I'd like to help you find the best alternates. You can say 'yes' if you'd like suggestions, 'no' if you prefer to add specific ASINs yourself, or 'maybe' if you'd like to know more about how alternates can help.";
            
            addChatMessage(clarification);
        }
    }
    
    // Start guided requirements with contextual questions
    function startGuidedRequirements() {
        enhancedConversationState.currentQuestion = 0;
        
        // Generate contextual questions based on product
        const contextualQuestions = generateContextualQuestions(enhancedConversationState.productData);
        
        // Update the conversation step with contextual questions
        ENHANCED_CONVERSATION_STEPS.REQUIREMENTS_GATHERING.subQuestions = contextualQuestions;
        
        const questions = contextualQuestions;
        const productName = enhancedConversationState.productData?.name || 'this product';
        
        addChatMessage(`Great! To find the best alternates for ${productName}, I need to understand what's important to you.\n\n**Question 1 of ${questions.length}:** ${questions[0]}`);
    }
    
    // Enhanced requirements processing with context awareness
    function processEnhancedRequirements() {
        log('Processing enhanced requirements:', enhancedConversationState.requirements);
        
        // Generate context-aware summary
        const reqSummary = generateContextAwareRequirementsSummary();
        const productName = enhancedConversationState.productData?.name || 'this product';
        
        addChatMessage(`Based on your answers about ${productName}, I understand you're looking for:\n\n${reqSummary}\n\nLet me search for suitable alternates...`);
        
        // TODO: This will integrate with LLM service in Phase 3
        // For now, simulate finding alternates with context-aware messaging
        setTimeout(() => {
            enhancedConversationState.step = 'PRESENT_ALTERNATES';
            
            const category = detectProductCategory(enhancedConversationState.productData);
            let searchMessage = "I found several potential alternates based on your requirements.";
            
            // Add category-specific search insights
            switch (category) {
                case 'electronics':
                    searchMessage += " I focused on devices with similar functionality but potentially better specs or value.";
                    break;
                case 'office_supplies':
                    searchMessage += " I looked for supplies with equivalent performance but better bulk pricing or quality.";
                    break;
                case 'tools':
                    searchMessage += " I searched for tools with similar capabilities but potentially better durability or ergonomics.";
                    break;
                default:
                    searchMessage += " I searched across similar products that match your specific requirements.";
            }
            
            searchMessage += " However, the product search integration is not yet implemented. For now, you can add specific ASINs manually below.";
            
            addChatMessage(searchMessage);
            
            if (enhancedConversationState.approach === 'both' || enhancedConversationState.approach === 'guided') {
                showManualASINSection();
                showAlternatesSelection();
            }
        }, 2000);
    }
    
    // Generate context-aware requirements summary
    function generateContextAwareRequirementsSummary() {
        const req = enhancedConversationState.requirements;
        const category = detectProductCategory(enhancedConversationState.productData);
        const summary = [];
        
        // Category-specific summary formatting
        if (req.useCase) {
            const useCaseLabel = category === 'electronics' ? 'Primary use' : 
                               category === 'tools' ? 'Project type' :
                               category === 'office_supplies' ? 'Office application' : 'Use case';
            summary.push(`• **${useCaseLabel}**: ${req.useCase}`);
        }
        
        if (req.mustHaveFeatures.length > 0) {
            const featuresLabel = category === 'electronics' ? 'Required features' :
                                category === 'tools' ? 'Performance requirements' :
                                'Must-have qualities';
            summary.push(`• **${featuresLabel}**: ${req.mustHaveFeatures.join(', ')}`);
        }
        
        if (req.priceRange) {
            if (req.priceRange.max && req.priceRange.min > 0) {
                summary.push(`• **Budget range**: $${req.priceRange.min} - $${req.priceRange.max}`);
            } else if (req.priceRange.max) {
                summary.push(`• **Maximum budget**: $${req.priceRange.max}`);
            } else if (req.priceRange.min) {
                summary.push(`• **Minimum price**: $${req.priceRange.min}`);
            }
        }
        
        if (req.brandPreferences.length > 0) {
            summary.push(`• **Preferred brands**: ${req.brandPreferences.join(', ')}`);
        }
        
        if (req.brandExclusions.length > 0) {
            summary.push(`• **Brands to avoid**: ${req.brandExclusions.join(', ')}`);
        }
        
        if (req.technicalSpecs.length > 0) {
            const specsLabel = category === 'electronics' ? 'Technical specifications' :
                             category === 'tools' ? 'Performance specs' :
                             'Technical requirements';
            summary.push(`• **${specsLabel}**: ${req.technicalSpecs.join(', ')}`);
        }
        
        // Add category-specific insights
        if (req.keywords.length > 0) {
            const keywordInsights = generateKeywordInsights(req.keywords, category);
            if (keywordInsights) {
                summary.push(`• **Key considerations**: ${keywordInsights}`);
            }
        }
        
        return summary.length > 0 ? summary.join('\n') : 
               `General alternate products that serve a similar purpose to your ${enhancedConversationState.productData?.name || 'selected item'}`;
    }
    
    // Conversation state persistence system
    const CONVERSATION_PERSISTENCE = {
        STORAGE_KEY: 'cqe_alternates_conversation_state',
        EXPIRY_HOURS: 24, // Conversation state expires after 24 hours
        
        // Save conversation state to localStorage
        saveState: function(state) {
            try {
                const stateWithTimestamp = {
                    ...state,
                    savedAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + (this.EXPIRY_HOURS * 60 * 60 * 1000)).toISOString()
                };
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateWithTimestamp));
                log('Conversation state saved to localStorage');
                return true;
            } catch (error) {
                log('Error saving conversation state:', error);
                return false;
            }
        },
        
        // Load conversation state from localStorage
        loadState: function() {
            try {
                const savedState = localStorage.getItem(this.STORAGE_KEY);
                if (!savedState) {
                    log('No saved conversation state found');
                    return null;
                }
                
                const state = JSON.parse(savedState);
                
                // Check if state has expired
                if (state.expiresAt && new Date(state.expiresAt) < new Date()) {
                    log('Saved conversation state has expired, clearing...');
                    this.clearState();
                    return null;
                }
                
                log('Conversation state loaded from localStorage');
                return state;
            } catch (error) {
                log('Error loading conversation state:', error);
                this.clearState(); // Clear corrupted state
                return null;
            }
        },
        
        // Clear conversation state from localStorage
        clearState: function() {
            try {
                localStorage.removeItem(this.STORAGE_KEY);
                log('Conversation state cleared from localStorage');
                return true;
            } catch (error) {
                log('Error clearing conversation state:', error);
                return false;
            }
        },
        
        // Check if there's a valid saved state
        hasValidState: function() {
            const state = this.loadState();
            return state !== null;
        }
    };
    
    // Auto-save conversation state at key points
    function autoSaveConversationState() {
        // Only save if we have meaningful progress
        if (enhancedConversationState.step !== 'WILLINGNESS_CHECK' || 
            enhancedConversationState.conversationHistory.length > 1 ||
            enhancedConversationState.selectedAlternates.length > 0) {
            
            CONVERSATION_PERSISTENCE.saveState(enhancedConversationState);
        }
    }
    
    // Restore conversation from saved state
    function restoreConversationState() {
        const savedState = CONVERSATION_PERSISTENCE.loadState();
        if (!savedState) return false;
        
        try {
            // Restore the conversation state
            enhancedConversationState = {
                ...savedState,
                // Remove persistence metadata
                savedAt: undefined,
                expiresAt: undefined
            };
            
            // Restore chat messages
            const messagesContainer = document.querySelector('#cqe-chat-messages');
            if (messagesContainer && enhancedConversationState.conversationHistory) {
                messagesContainer.innerHTML = '';
                
                enhancedConversationState.conversationHistory.forEach(historyItem => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `chat-message ${historyItem.isUser ? 'user' : 'assistant'}`;
                    
                    const sender = historyItem.isUser ? 'You' : 'Assistant';
                    messageDiv.innerHTML = `<strong>${sender}:</strong> ${historyItem.message}`;
                    
                    messagesContainer.appendChild(messageDiv);
                });
                
                // Scroll to bottom
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Restore UI state
            if (enhancedConversationState.selectedAlternates.length > 0) {
                showManualASINSection();
                updateManualASINsList();
                updateConfirmButton();
            }
            
            // Show appropriate sections based on conversation step
            if (['MANUAL_ADDITION', 'MANUAL_ADDITION_ONLY', 'OFFER_MANUAL_ONLY'].includes(enhancedConversationState.step)) {
                showManualASINSection();
            }
            
            if (['PRESENT_ALTERNATES', 'REFINE_SELECTION'].includes(enhancedConversationState.step)) {
                showAlternatesSelection();
            }
            
            log('Conversation state restored successfully');
            return true;
        } catch (error) {
            log('Error restoring conversation state:', error);
            CONVERSATION_PERSISTENCE.clearState();
            return false;
        }
    }
    
    // Enhanced conversation state reset with persistence handling
    function resetConversationState(productData) {
        // Clear any existing saved state when starting fresh
        CONVERSATION_PERSISTENCE.clearState();
        
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
    
    // Enhanced modal opening with state restoration
    function openModal(productData) {
        let modal = document.querySelector('#cqe-alternates-modal');
        
        // Create modal if it doesn't exist
        if (!modal) {
            modal = createModal();
        }
        
        // Check if we should restore a previous conversation for this product
        const savedState = CONVERSATION_PERSISTENCE.loadState();
        let stateRestored = false;
        
        if (savedState && savedState.productData && 
            savedState.productData.asin === productData.asin) {
            
            // Ask user if they want to continue previous conversation
            const continueConversation = confirm(
                `I found a previous conversation about ${productData.name}. Would you like to continue where you left off?`
            );
            
            if (continueConversation) {
                stateRestored = restoreConversationState();
                
                if (stateRestored) {
                    // Update product context with current data (in case it changed)
                    enhancedConversationState.productData = productData;
                    
                    addChatMessage("Welcome back! I've restored our previous conversation. You can continue from where we left off.", false);
                }
            }
        }
        
        // If no state was restored, start fresh
        if (!stateRestored) {
            resetConversationState(productData);
        }
        
        // Update product context display
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
    
    // Enhanced message adding with auto-save
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
        
        // Auto-save state after each message
        autoSaveConversationState();
        
        log(`Chat message added (${sender}):`, message);
    }
    
    // Enhanced manual ASIN handling with auto-save
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
        
        // Auto-save state after adding ASIN
        autoSaveConversationState();
        
        log('Manual ASIN added:', alternate);
    }
    
    // Enhanced modal closing with state cleanup
    function closeModal() {
        const modal = document.querySelector('#cqe-alternates-modal');
        if (modal) {
            modal.style.display = 'none';
            
            // Stop auto-save interval
            stopAutoSaveInterval();
            
            // Clear conversation state when modal is closed
            // (user can restore it if they reopen for the same product)
            CONVERSATION_PERSISTENCE.clearState();
            
            log('Modal closed and conversation state cleared');
        }
    }
    
    // Advanced conversation analytics system
    const CONVERSATION_ANALYTICS = {
        ANALYTICS_KEY: 'cqe_alternates_analytics',
        
        // Initialize analytics data structure
        initializeAnalytics: function() {
            const analytics = {
                sessions: [],
                aggregateStats: {
                    totalSessions: 0,
                    completedSessions: 0,
                    averageSessionDuration: 0,
                    mostCommonApproach: null,
                    topProductCategories: {},
                    conversionRate: 0,
                    averageAlternatesAdded: 0,
                    commonDropOffPoints: {},
                    userSatisfactionIndicators: {}
                },
                lastUpdated: new Date().toISOString()
            };
            
            this.saveAnalytics(analytics);
            return analytics;
        },
        
        // Save analytics to localStorage
        saveAnalytics: function(analytics) {
            try {
                localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
                return true;
            } catch (error) {
                log('Error saving analytics:', error);
                return false;
            }
        },
        
        // Load analytics from localStorage
        loadAnalytics: function() {
            try {
                const saved = localStorage.getItem(this.ANALYTICS_KEY);
                return saved ? JSON.parse(saved) : this.initializeAnalytics();
            } catch (error) {
                log('Error loading analytics:', error);
                return this.initializeAnalytics();
            }
        },
        
        // Start tracking a new conversation session
        startSession: function(productData) {
            const analytics = this.loadAnalytics();
            
            const session = {
                sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                startTime: new Date().toISOString(),
                endTime: null,
                productData: {
                    asin: productData.asin,
                    name: productData.name,
                    category: detectProductCategory(productData)
                },
                conversationFlow: [],
                userActions: [],
                approach: null,
                completed: false,
                alternatesAdded: 0,
                dropOffPoint: null,
                userSatisfactionScore: null,
                totalMessages: 0,
                userMessages: 0,
                assistantMessages: 0,
                averageResponseTime: 0,
                requirementsComplexity: 0
            };
            
            analytics.sessions.push(session);
            analytics.aggregateStats.totalSessions++;
            
            this.saveAnalytics(analytics);
            
            // Store current session ID for tracking
            this.currentSessionId = session.sessionId;
            
            log('Analytics session started:', session.sessionId);
            return session.sessionId;
        },
        
        // Track conversation step progression
        trackStepProgression: function(fromStep, toStep, userInput = null) {
            if (!this.currentSessionId) return;
            
            const analytics = this.loadAnalytics();
            const session = analytics.sessions.find(s => s.sessionId === this.currentSessionId);
            
            if (session) {
                session.conversationFlow.push({
                    timestamp: new Date().toISOString(),
                    fromStep: fromStep,
                    toStep: toStep,
                    userInput: userInput ? userInput.substring(0, 100) : null // Truncate for privacy
                });
                
                this.saveAnalytics(analytics);
            }
        },
        
        // Track user actions (ASIN additions, removals, etc.)
        trackUserAction: function(action, details = {}) {
            if (!this.currentSessionId) return;
            
            const analytics = this.loadAnalytics();
            const session = analytics.sessions.find(s => s.sessionId === this.currentSessionId);
            
            if (session) {
                session.userActions.push({
                    timestamp: new Date().toISOString(),
                    action: action,
                    details: details
                });
                
                // Update specific counters
                if (action === 'asin_added') {
                    session.alternatesAdded++;
                }
                
                this.saveAnalytics(analytics);
            }
        },
        
        // Track message exchange
        trackMessage: function(isUser, message, responseTime = null) {
            if (!this.currentSessionId) return;
            
            const analytics = this.loadAnalytics();
            const session = analytics.sessions.find(s => s.sessionId === this.currentSessionId);
            
            if (session) {
                session.totalMessages++;
                
                if (isUser) {
                    session.userMessages++;
                } else {
                    session.assistantMessages++;
                }
                
                // Track response time for user messages
                if (isUser && responseTime) {
                    const currentAvg = session.averageResponseTime;
                    const messageCount = session.userMessages;
                    session.averageResponseTime = ((currentAvg * (messageCount - 1)) + responseTime) / messageCount;
                }
                
                this.saveAnalytics(analytics);
            }
        },
        
        // End conversation session
        endSession: function(completed = false, dropOffPoint = null) {
            if (!this.currentSessionId) return;
            
            const analytics = this.loadAnalytics();
            const session = analytics.sessions.find(s => s.sessionId === this.currentSessionId);
            
            if (session) {
                session.endTime = new Date().toISOString();
                session.completed = completed;
                session.dropOffPoint = dropOffPoint;
                
                // Calculate session duration
                const duration = new Date(session.endTime) - new Date(session.startTime);
                session.duration = duration;
                
                // Update aggregate stats
                if (completed) {
                    analytics.aggregateStats.completedSessions++;
                }
                
                this.updateAggregateStats(analytics);
                this.saveAnalytics(analytics);
                
                log('Analytics session ended:', this.currentSessionId, 'Completed:', completed);
                this.currentSessionId = null;
            }
        },
        
        // Update aggregate statistics
        updateAggregateStats: function(analytics) {
            const sessions = analytics.sessions;
            const stats = analytics.aggregateStats;
            
            // Conversion rate
            stats.conversionRate = sessions.length > 0 ? 
                (stats.completedSessions / stats.totalSessions) * 100 : 0;
            
            // Average session duration
            const completedSessions = sessions.filter(s => s.completed && s.duration);
            stats.averageSessionDuration = completedSessions.length > 0 ?
                completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length : 0;
            
            // Average alternates added
            stats.averageAlternatesAdded = sessions.length > 0 ?
                sessions.reduce((sum, s) => sum + s.alternatesAdded, 0) / sessions.length : 0;
            
            // Most common approach
            const approaches = sessions.filter(s => s.approach).map(s => s.approach);
            stats.mostCommonApproach = this.getMostCommon(approaches);
            
            // Top product categories
            const categories = sessions.map(s => s.productData.category);
            stats.topProductCategories = this.getFrequencyMap(categories);
            
            // Common drop-off points
            const dropOffs = sessions.filter(s => s.dropOffPoint).map(s => s.dropOffPoint);
            stats.commonDropOffPoints = this.getFrequencyMap(dropOffs);
            
            stats.lastUpdated = new Date().toISOString();
        },
        
        // Helper function to get most common item
        getMostCommon: function(array) {
            if (array.length === 0) return null;
            
            const frequency = this.getFrequencyMap(array);
            return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
        },
        
        // Helper function to get frequency map
        getFrequencyMap: function(array) {
            return array.reduce((freq, item) => {
                freq[item] = (freq[item] || 0) + 1;
                return freq;
            }, {});
        },
        
        // Get analytics summary for debugging/monitoring
        getAnalyticsSummary: function() {
            const analytics = this.loadAnalytics();
            return {
                totalSessions: analytics.aggregateStats.totalSessions,
                completedSessions: analytics.aggregateStats.completedSessions,
                conversionRate: analytics.aggregateStats.conversionRate.toFixed(1) + '%',
                averageAlternatesAdded: analytics.aggregateStats.averageAlternatesAdded.toFixed(1),
                mostCommonApproach: analytics.aggregateStats.mostCommonApproach,
                topCategories: Object.entries(analytics.aggregateStats.topProductCategories)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([cat, count]) => `${cat}: ${count}`)
            };
        }
    };
    
    // Enhanced conversation tracking integration
    let lastMessageTime = Date.now();
    
    // Enhanced message adding with analytics tracking
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
        
        // Calculate response time for analytics
        const currentTime = Date.now();
        const responseTime = isUser ? null : (currentTime - lastMessageTime);
        lastMessageTime = currentTime;
        
        // Store in enhanced conversation history
        enhancedConversationState.conversationHistory.push({
            message: message,
            isUser: isUser,
            timestamp: new Date().toISOString(),
            step: enhancedConversationState.step,
            questionIndex: enhancedConversationState.currentQuestion
        });
        
        // Track message in analytics
        CONVERSATION_ANALYTICS.trackMessage(isUser, message, responseTime);
        
        // Auto-save state after each message
        autoSaveConversationState();
        
        log(`Chat message added (${sender}):`, message);
    }
    
    // Enhanced conversation step processing with analytics
    function processEnhancedUserInput(userInput) {
        const currentStep = ENHANCED_CONVERSATION_STEPS[enhancedConversationState.step];
        
        if (!currentStep) {
            log('Error: Invalid conversation step:', enhancedConversationState.step);
            return;
        }
        
        // Track step progression
        const previousStep = enhancedConversationState.step;
        
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
        
        // Track step progression if step changed
        if (previousStep !== enhancedConversationState.step) {
            CONVERSATION_ANALYTICS.trackStepProgression(previousStep, enhancedConversationState.step, userInput);
        }
    }
    
    // Enhanced approach selection with analytics tracking
    function handleApproachSelection(response) {
        const normalizedResponse = response.toLowerCase().trim();
        
        if (normalizedResponse.includes('question') || normalizedResponse.includes('ask me')) {
            enhancedConversationState.approach = 'guided';
            CONVERSATION_ANALYTICS.trackUserAction('approach_selected', { approach: 'guided' });
            enhancedConversationState.step = 'REQUIREMENTS_GATHERING';
            startGuidedRequirements();
        } else if (normalizedResponse.includes('specific') || normalizedResponse.includes('add') || normalizedResponse.includes('asin')) {
            enhancedConversationState.approach = 'manual';
            CONVERSATION_ANALYTICS.trackUserAction('approach_selected', { approach: 'manual' });
            enhancedConversationState.step = 'MANUAL_ADDITION_ONLY';
            addChatMessage(ENHANCED_CONVERSATION_STEPS.MANUAL_ADDITION_ONLY.message);
            showManualASINSection();
        } else if (normalizedResponse.includes('both')) {
            enhancedConversationState.approach = 'both';
            CONVERSATION_ANALYTICS.trackUserAction('approach_selected', { approach: 'both' });
            enhancedConversationState.step = 'REQUIREMENTS_GATHERING';
            startGuidedRequirements();
        } else {
            addChatMessage("Please choose one: 'Ask me questions' for guided suggestions, 'I'll add specific ASINs' for manual input, or 'Both' for a combination approach.");
        }
    }
    
    // Enhanced manual ASIN handling with analytics tracking
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
            CONVERSATION_ANALYTICS.trackUserAction('asin_validation_failed', { input: rawInput.substring(0, 20) });
            return;
        }
        
        // Check if already added
        if (enhancedConversationState.selectedAlternates.some(alt => alt.asin === extractedASIN)) {
            showInputError(asinInput, "This ASIN has already been added.");
            CONVERSATION_ANALYTICS.trackUserAction('asin_duplicate_attempt', { asin: extractedASIN });
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
        
        // Track successful ASIN addition
        CONVERSATION_ANALYTICS.trackUserAction('asin_added', { 
            asin: extractedASIN, 
            source: 'manual',
            totalAlternates: enhancedConversationState.selectedAlternates.length
        });
        
        // Update UI
        updateManualASINsList();
        updateConfirmButton();
        
        // Clear input
        asinInput.value = '';
        
        addChatMessage(`Added ASIN ${extractedASIN} to your alternates list.`, false);
        
        // Auto-save state after adding ASIN
        autoSaveConversationState();
        
        log('Manual ASIN added:', alternate);
    }
    
    // Enhanced modal opening with analytics session start
    function openModal(productData) {
        let modal = document.querySelector('#cqe-alternates-modal');
        
        // Create modal if it doesn't exist
        if (!modal) {
            modal = createModal();
        }
        
        // Start analytics session
        CONVERSATION_ANALYTICS.startSession(productData);
        
        // Check if we should restore a previous conversation for this product
        const savedState = CONVERSATION_PERSISTENCE.loadState();
        let stateRestored = false;
        
        if (savedState && savedState.productData && 
            savedState.productData.asin === productData.asin) {
            
            // Ask user if they want to continue previous conversation
            const continueConversation = confirm(
                `I found a previous conversation about ${productData.name}. Would you like to continue where you left off?`
            );
            
            if (continueConversation) {
                stateRestored = restoreConversationState();
                
                if (stateRestored) {
                    // Update product context with current data (in case it changed)
                    enhancedConversationState.productData = productData;
                    
                    addChatMessage("Welcome back! I've restored our previous conversation. You can continue from where we left off.", false);
                    CONVERSATION_ANALYTICS.trackUserAction('conversation_restored', { asin: productData.asin });
                }
            }
        }
        
        // If no state was restored, start fresh
        if (!stateRestored) {
            resetConversationState(productData);
        }
        
        // Update product context display
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
        
        // Start auto-save interval
        startAutoSaveInterval();
        
        // Focus on chat input
        setTimeout(() => {
            const chatInput = document.querySelector('#cqe-chat-input');
            if (chatInput) {
                chatInput.focus();
            }
        }, 100);
        
        log('Modal opened for product:', productData);
    }
    
    // Enhanced modal closing with analytics session end
    function closeModal() {
        const modal = document.querySelector('#cqe-alternates-modal');
        if (modal) {
            modal.style.display = 'none';
            
            // Stop auto-save interval
            stopAutoSaveInterval();
            
            // End analytics session
            const completed = enhancedConversationState.selectedAlternates.length > 0;
            const dropOffPoint = completed ? null : enhancedConversationState.step;
            CONVERSATION_ANALYTICS.endSession(completed, dropOffPoint);
            
            // Clear conversation state when modal is closed
            // (user can restore it if they reopen for the same product)
            CONVERSATION_PERSISTENCE.clearState();
            
            log('Modal closed and conversation state cleared');
        }
    }
    
    // AWS Bedrock Agent Runtime Integration System
    const BEDROCK_AGENT_INTEGRATION = {
        // Configuration
        CONFIG: {
            region: 'us-west-2',
            agentId: 'CAP1I3RZLN',
            agentAliasId: 'CAP1I3RZLN', // Using same ID as provided
            timeout: 30000, // 30 second timeout
            maxRetries: 3,
            retryDelay: 1000 // 1 second base delay
        },
        
        // Authentication and headers
        getHeaders: function() {
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`,
                'X-Amzn-RequestId': this.generateRequestId(),
                'User-Agent': 'CQE-Alternates-Enhancement/1.0'
            };
        },
        
        // Get authentication token (placeholder - would integrate with actual auth)
        getAuthToken: function() {
            // In a real implementation, this would get the token from:
            // - Midway authentication
            // - Internal service credentials
            // - Browser session tokens
            return 'placeholder_auth_token';
        },
        
        // Generate unique request ID for tracking
        generateRequestId: function() {
            return 'cqe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        // Make LLM request with retry logic
        makeRequest: async function(prompt, options = {}) {
            const config = { ...this.CONFIG, ...options };
            let lastError = null;
            
            for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
                try {
                    log(`Strands API attempt ${attempt}/${config.maxRetries}`);
                    
                    const response = await this.performRequest(prompt, config);
                    
                    if (response.success) {
                        log('Strands API request successful');
                        return response;
                    } else {
                        throw new Error(response.error || 'Unknown API error');
                    }
                    
                } catch (error) {
                    lastError = error;
                    log(`Strands API attempt ${attempt} failed:`, error.message);
                    
                    // Check for authentication errors - don't retry these
                    if (error.message.includes('Authentication failed') || error.message.includes('credentials') || error.message.includes('unauthorized') || error.status === 401 || error.status === 403) {
                        log('Authentication error detected, notifying user');
                        return {
                            success: false,
                            error: 'Authentication failed',
                            response: 'I\'m having trouble authenticating with the AI service. Please ensure you\'re logged in to AWS and have the necessary permissions.',
                            authError: true
                        };
                    }
                    
                    // Wait before retry (exponential backoff)
                    if (attempt < config.maxRetries) {
                        const delay = config.retryDelay * Math.pow(2, attempt - 1);
                        await this.sleep(delay);
                    }
                }
            }
            
            // All retries failed
            log('All Bedrock Agent attempts failed:', lastError);
            return {
                success: false,
                error: lastError.message || 'Bedrock Agent service unavailable',
                response: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again in a moment.'
            };
        },
        
        // AWS SDK and client management
        sdkLoaded: false,
        client: null,
        currentSessionId: null,
        
        // Initialize AWS SDK
        initializeSDK: async function() {
            console.log('🔍 DEBUG: initializeSDK called');
            console.log('🔍 DEBUG: sdkLoaded:', this.sdkLoaded, 'window.AWS:', !!window.AWS);
            
            if (this.sdkLoaded && window.AWS) {
                console.log('🔍 DEBUG: SDK already loaded, returning true');
                return true;
            }
            
            try {
                console.log('🔍 DEBUG: Loading AWS SDK from CDN...');
                log('Loading AWS SDK...');
                
                // Load AWS SDK from CDN
                const script = document.createElement('script');
                script.src = 'https://sdk.amazonaws.com/js/aws-sdk-2.x.x.min.js';
                script.async = true;
                
                await new Promise((resolve, reject) => {
                    script.onload = () => {
                        console.log('🔍 DEBUG: AWS SDK script loaded successfully');
                        resolve();
                    };
                    script.onerror = (error) => {
                        console.log('🔍 DEBUG: AWS SDK script failed to load:', error);
                        reject(error);
                    };
                    document.head.appendChild(script);
                });
                
                console.log('🔍 DEBUG: Checking if window.AWS is available:', !!window.AWS);
                
                if (!window.AWS) {
                    throw new Error('AWS SDK failed to load');
                }
                
                console.log('🔍 DEBUG: Configuring AWS...');
                
                // Configure AWS with STS tokens
                window.AWS.config.update({
                    region: this.CONFIG.region
                });
                
                this.sdkLoaded = true;
                console.log('🔍 DEBUG: AWS SDK loaded and configured successfully');
                log('AWS SDK loaded successfully');
                return true;
                
            } catch (error) {
                console.log('🔍 DEBUG: Failed to load AWS SDK:', error);
                log('Failed to load AWS SDK:', error);
                return false;
            }
        },
        
        // Initialize Bedrock Agent Runtime client
        initializeClient: async function() {
            if (this.client) {
                return this.client;
            }
            
            const sdkReady = await this.initializeSDK();
            if (!sdkReady) {
                throw new Error('AWS SDK not available');
            }
            
            try {
                // Create Bedrock Agent Runtime client
                this.client = new window.AWS.BedrockAgentRuntime({
                    region: this.CONFIG.region
                });
                
                log('Bedrock Agent Runtime client initialized');
                return this.client;
                
            } catch (error) {
                log('Failed to initialize Bedrock client:', error);
                throw error;
            }
        },
        
        generateSessionId: function() {
            return 'cqe_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        getSessionId: function() {
            if (!this.currentSessionId) {
                this.currentSessionId = this.generateSessionId();
            }
            return this.currentSessionId;
        },
        
        resetSession: function() {
            this.currentSessionId = null;
        },
        
        // Perform the actual Bedrock Agent request
        performRequest: async function(prompt, config) {
            console.log('🔍 DEBUG: performRequest called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: Using real Bedrock Agent implementation');
            
            try {
                console.log('🔍 DEBUG: Attempting to initialize client...');
                const client = await this.initializeClient();
                const sessionId = this.getSessionId();
                
                console.log('🔍 DEBUG: Client initialized, invoking Bedrock Agent...');
                log('Invoking Bedrock Agent with prompt:', prompt.substring(0, 100) + '...');
                
                const params = {
                    agentId: config.agentId,
                    agentAliasId: config.agentAliasId,
                    sessionId: sessionId,
                    inputText: prompt
                };
                
                console.log('🔍 DEBUG: Bedrock Agent params:', params);
                
                // Make the actual Bedrock Agent call
                const response = await client.invokeAgent(params).promise();
                
                console.log('🔍 DEBUG: Bedrock Agent response received:', response);
                
                if (!response.completion) {
                    throw new Error('No completion in response');
                }
                
                // Process streaming response
                let completion = '';
                for await (const chunkEvent of response.completion) {
                    const chunk = chunkEvent.chunk;
                    if (chunk && chunk.bytes) {
                        const decodedResponse = new TextDecoder('utf-8').decode(chunk.bytes);
                        completion += decodedResponse;
                    }
                }
                
                console.log('🔍 DEBUG: Final completion:', completion);
                
                return {
                    success: true,
                    response: completion,
                    model: 'bedrock-agent',
                    requestId: sessionId,
                    usage: {
                        promptTokens: Math.floor(prompt.length / 4),
                        completionTokens: Math.floor(completion.length / 4),
                        totalTokens: Math.floor(prompt.length / 4) + Math.floor(completion.length / 4)
                    }
                };
                
            } catch (error) {
                console.log('🔍 DEBUG: Error in performRequest:', error);
                console.log('🔍 DEBUG: Error message:', error.message);
                console.log('🔍 DEBUG: Error stack:', error.stack);
                
                log('Bedrock Agent request error:', error);
                
                // Check for authentication errors
                if (error.message.includes('credentials') || error.message.includes('authentication') || error.message.includes('unauthorized')) {
                    throw new Error('Authentication failed: Please ensure you\'re logged in to AWS and have the necessary permissions.');
                }
                
                throw error;
            }
        },
        
        // Generate simulated LLM response for testing
        generateSimulatedResponse: function(prompt) {
            // Analyze prompt to generate appropriate response
            const promptLower = prompt.toLowerCase();
            
            if (promptLower.includes('requirements') && promptLower.includes('extract')) {
                return JSON.stringify({
                    specifications: ['durable', 'waterproof', 'portable'],
                    price_constraints: { max_price: 50 },
                    use_case: 'outdoor activities',
                    brand_preferences: ['3M', 'Sony'],
                    must_have_features: ['wireless', 'long battery life'],
                    nice_to_have_features: ['compact design']
                });
            }
            
            if (promptLower.includes('search terms') && promptLower.includes('generate')) {
                return JSON.stringify([
                    'waterproof wireless headphones',
                    'durable outdoor electronics',
                    'portable audio device',
                    'sports headphones wireless',
                    'rugged bluetooth earbuds'
                ]);
            }
            
            if (promptLower.includes('evaluate') && promptLower.includes('products')) {
                return JSON.stringify([
                    {
                        asin: 'B08N5WRWNW',
                        suitability_score: 85,
                        matching_features: ['wireless', 'waterproof', 'durable'],
                        missing_features: ['long battery life'],
                        explanation: 'Good match for outdoor use with excellent durability'
                    },
                    {
                        asin: 'B07G2KHGQ8',
                        suitability_score: 92,
                        matching_features: ['wireless', 'long battery life', 'portable'],
                        missing_features: [],
                        explanation: 'Excellent match with all required features'
                    }
                ]);
            }
            
            // Default conversational response
            return "I understand your requirements and I'm processing them to find the best alternates for you.";
        },
        
        // Utility function for delays
        sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };
    
    // LLM-powered requirements processing
    async function processRequirementsWithLLM(requirements) {
        const prompt = `
Extract key product requirements from this customer input:
"${requirements.text || requirements}"

Return a structured JSON with:
- specifications: technical specs needed
- price_constraints: budget or price preferences  
- use_case: intended use or context
- brand_preferences: preferred or excluded brands
- must_have_features: essential features
- nice_to_have_features: preferred but optional features

Customer input: "${requirements.text || requirements}"
        `.trim();
        
        try {
            const response = await BEDROCK_AGENT_INTEGRATION.makeRequest(prompt, {
                model: 'claude-3-sonnet',
                temperature: 0.3 // Lower temperature for structured extraction
            });
            
            if (response.success) {
                try {
                    const parsed = JSON.parse(response.response);
                    log('LLM requirements extraction successful:', parsed);
                    return {
                        success: true,
                        requirements: parsed,
                        source: 'llm'
                    };
                } catch (parseError) {
                    log('Error parsing LLM response:', parseError);
                    return {
                        success: false,
                        error: 'Invalid response format from LLM',
                        fallback: true
                    };
                }
            } else {
                return {
                    success: false,
                    error: response.error,
                    fallback: response.fallback
                };
            }
        } catch (error) {
            log('Error in LLM requirements processing:', error);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }
    
    // LLM-powered search term generation
    async function generateSearchTermsWithLLM(requirements) {
        const reqText = typeof requirements === 'string' ? requirements : 
                       requirements.text || JSON.stringify(requirements);
        
        const prompt = `
Based on these product requirements:
${reqText}

Generate 3-5 optimized search terms for finding suitable alternates on Amazon.
Focus on key specifications and use cases rather than specific brands.
Return as a JSON array of strings.

Requirements: ${reqText}
        `.trim();
        
        try {
            const response = await BEDROCK_AGENT_INTEGRATION.makeRequest(prompt, {
                model: 'claude-3-sonnet',
                temperature: 0.5 // Moderate creativity for search terms
            });
            
            if (response.success) {
                try {
                    const searchTerms = JSON.parse(response.response);
                    log('LLM search terms generation successful:', searchTerms);
                    return {
                        success: true,
                        searchTerms: Array.isArray(searchTerms) ? searchTerms : [searchTerms],
                        source: 'llm'
                    };
                } catch (parseError) {
                    log('Error parsing LLM search terms:', parseError);
                    return {
                        success: false,
                        error: 'Invalid search terms format from LLM',
                        fallback: true
                    };
                }
            } else {
                return {
                    success: false,
                    error: response.error,
                    fallback: response.fallback
                };
            }
        } catch (error) {
            log('Error in LLM search terms generation:', error);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }
    
    // LLM-powered product evaluation
    async function evaluateProductsWithLLM(products, requirements) {
        const reqText = typeof requirements === 'string' ? requirements : 
                       requirements.text || JSON.stringify(requirements);
        
        const productsText = Array.isArray(products) ? 
                           products.map(p => `${p.asin}: ${p.name || p.title}`).join('\n') :
                           JSON.stringify(products);
        
        const prompt = `
Evaluate these products against customer requirements:

Requirements: ${reqText}

Products:
${productsText}

For each product, provide:
- suitability_score: 0-100
- matching_features: list of features that match requirements
- missing_features: list of required features not met
- explanation: brief explanation of why it's suitable or not

Return top 8 products ranked by suitability as JSON array.
        `.trim();
        
        try {
            const response = await BEDROCK_AGENT_INTEGRATION.makeRequest(prompt, {
                model: 'claude-3-sonnet',
                temperature: 0.4 // Balanced creativity for evaluation
            });
            
            if (response.success) {
                try {
                    const evaluations = JSON.parse(response.response);
                    log('LLM product evaluation successful:', evaluations);
                    return {
                        success: true,
                        evaluations: Array.isArray(evaluations) ? evaluations : [evaluations],
                        source: 'llm'
                    };
                } catch (parseError) {
                    log('Error parsing LLM evaluations:', parseError);
                    return {
                        success: false,
                        error: 'Invalid evaluation format from LLM',
                        fallback: true
                    };
                }
            } else {
                return {
                    success: false,
                    error: response.error,
                    fallback: response.fallback
                };
            }
        } catch (error) {
            log('Error in LLM product evaluation:', error);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }
    
    // Add analytics summary and LLM info to debug function
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
        
        // Add analytics summary
        console.log('8. Analytics Summary:');
        const analyticsSummary = CONVERSATION_ANALYTICS.getAnalyticsSummary();
        console.log('   Analytics data:', analyticsSummary);
        
        // Add Bedrock Agent integration status
        console.log('9. Bedrock Agent Integration:');
        console.log('   Agent ID:', BEDROCK_AGENT_INTEGRATION.CONFIG.agentId);
        console.log('   Agent Alias ID:', BEDROCK_AGENT_INTEGRATION.CONFIG.agentAliasId);
        console.log('   Region:', BEDROCK_AGENT_INTEGRATION.CONFIG.region);
        console.log('   Current conversation state:', enhancedConversationState);
        
        console.log('=== End Debug Info ===');
        
        // Try to add button manually
        console.log('Attempting to add button...');
        addAlternatesButton();
        
        // Test LLM integration
        console.log('Testing LLM integration...');
        testLLMIntegration();
    };
    
    // Manual button addition function for testing
    window.forceAddAlternatesButton = function() {
        console.log('=== Force Adding Alternates Button ===');
        
        // Remove existing button if present
        const existing = document.querySelector('#cqe-add-alternates-btn');
        if (existing) {
            existing.remove();
            console.log('Removed existing button');
        }
        
        // Find any input field as fallback
        const anyInput = document.querySelector('input[type="text"]') || 
                        document.querySelector('input') ||
                        document.querySelector('#add-asin-or-isbn-form');
        
        if (!anyInput) {
            console.log('No input field found on page');
            return;
        }
        
        console.log('Using input field:', anyInput);
        
        // Create button with enhanced styling
        const button = document.createElement('button');
        button.id = 'cqe-add-alternates-btn';
        button.className = 'b-button';
        button.textContent = 'Add Alternates';
        button.style.cssText = `
            margin: 10px;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        // Add click handler
        button.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Add Alternates button clicked!');
            
            // Get ASIN from any available input
            const asin = anyInput.value || 'B00V5D4VX8'; // fallback ASIN for testing
            
            const productData = {
                id: 'test-' + Date.now(),
                asin: asin,
                name: `Test Product ${asin}`,
                quantity: '1',
                unitPrice: '10.00'
            };
            
            console.log('Opening modal with test data:', productData);
            openModal(productData);
        });
        
        // Insert button after the input
        anyInput.parentNode.insertBefore(button, anyInput.nextSibling);
        
        console.log('✅ Add Alternates button force-added successfully!');
        console.log('Button element:', button);
        
        return button;
    };
    
    // Intelligent Response Generation System
    const INTELLIGENT_RESPONSES = {
        // Response generation templates with context
        RESPONSE_CONTEXTS: {
            willingness_explanation: {
                prompt: `Generate a helpful explanation about product alternates for a customer considering {product_name}. 
                
                Context:
                - Product: {product_name}
                - Category: {product_category}
                - Customer seems hesitant about alternates
                
                Create a personalized, conversational response that:
                1. Acknowledges their specific product choice
                2. Explains benefits relevant to this product category
                3. Addresses common concerns about alternates
                4. Keeps a helpful, non-pushy tone
                5. Is 2-3 sentences maximum
                
                Product: {product_name}
                Category: {product_category}`,
                
                fallback: "Alternates can provide better value, improved features, or better availability than your original choice. They're especially helpful when suppliers have insights about newer or equivalent products that might better meet your needs."
            },
            
            requirements_clarification: {
                prompt: `Generate a follow-up question to clarify customer requirements for {product_name}.
                
                Context:
                - Product: {product_name}
                - Category: {product_category}
                - Previous answer: {previous_answer}
                - Current question focus: {question_focus}
                
                Create a natural follow-up question that:
                1. References their previous answer specifically
                2. Asks for more detail about {question_focus}
                3. Uses product-appropriate terminology
                4. Feels conversational, not interrogative
                5. Is one clear question
                
                Previous answer: {previous_answer}
                Focus: {question_focus}`,
                
                fallback: "Could you tell me more about what's most important to you in this product?"
            },
            
            requirements_summary: {
                prompt: `Create a conversational summary of customer requirements for {product_name}.
                
                Context:
                - Product: {product_name}
                - Category: {product_category}
                - Requirements: {requirements_json}
                
                Create a natural summary that:
                1. Sounds like you understand their needs
                2. Highlights the most important requirements
                3. Uses their own words where possible
                4. Shows you're ready to help find alternates
                5. Is encouraging and confident
                
                Requirements: {requirements_json}`,
                
                fallback: "Based on your requirements, I understand what you're looking for and I'm confident I can find suitable alternates."
            },
            
            search_progress: {
                prompt: `Generate a search progress message for finding alternates to {product_name}.
                
                Context:
                - Product: {product_name}
                - Category: {product_category}
                - Search terms: {search_terms}
                - Requirements focus: {requirements_focus}
                
                Create an engaging progress message that:
                1. Shows you're actively searching
                2. Mentions the search approach
                3. Builds confidence in finding good results
                4. Is specific to this product category
                5. Takes 1-2 sentences
                
                Search terms: {search_terms}
                Focus: {requirements_focus}`,
                
                fallback: "Searching for suitable alternates based on your requirements..."
            },
            
            no_results_encouragement: {
                prompt: `Generate an encouraging message when no perfect alternates are found for {product_name}.
                
                Context:
                - Product: {product_name}
                - Category: {product_category}
                - Requirements: {requirements_summary}
                - Search attempted: {search_attempted}
                
                Create a helpful response that:
                1. Acknowledges the search challenge
                2. Suggests alternative approaches
                3. Keeps the customer engaged
                4. Offers manual ASIN input as solution
                5. Maintains optimistic tone
                
                Requirements: {requirements_summary}`,
                
                fallback: "I didn't find perfect matches in my initial search, but you can add specific ASINs if you have alternates in mind, or we can try a broader search approach."
            }
        },
        
        // Generate intelligent response using LLM
        generateResponse: async function(responseType, context = {}) {
            const template = this.RESPONSE_CONTEXTS[responseType];
            if (!template) {
                log(`No template found for response type: ${responseType}`);
                return template?.fallback || "I'm here to help you find the best alternates.";
            }
            
            try {
                // Replace placeholders in prompt
                let prompt = template.prompt;
                for (const [key, value] of Object.entries(context)) {
                    const placeholder = `{${key}}`;
                    prompt = prompt.replace(new RegExp(placeholder, 'g'), value || 'not specified');
                }
                
                const response = await BEDROCK_AGENT_INTEGRATION.makeRequest(prompt, {
                    model: 'claude-3-sonnet',
                    temperature: 0.7, // Higher creativity for natural responses
                    maxTokens: 200 // Limit response length
                });
                
                if (response.success) {
                    const generatedResponse = response.response.trim();
                    log(`Generated intelligent response for ${responseType}:`, generatedResponse);
                    
                    // Track successful LLM response generation
                    CONVERSATION_ANALYTICS.trackUserAction('llm_response_generated', {
                        responseType: responseType,
                        success: true
                    });
                    
                    return generatedResponse;
                } else {
                    log(`LLM response generation failed for ${responseType}:`, response.error);
                    
                    // Track failed LLM response generation
                    CONVERSATION_ANALYTICS.trackUserAction('llm_response_failed', {
                        responseType: responseType,
                        error: response.error
                    });
                    
                    return template.fallback;
                }
                
            } catch (error) {
                log(`Error generating intelligent response for ${responseType}:`, error);
                
                CONVERSATION_ANALYTICS.trackUserAction('llm_response_error', {
                    responseType: responseType,
                    error: error.message
                });
                
                return template.fallback;
            }
        },
        
        // Generate contextual follow-up questions
        generateFollowUpQuestion: async function(previousAnswer, questionFocus, productData) {
            const context = {
                product_name: productData?.name || 'this product',
                product_category: detectProductCategory(productData),
                previous_answer: previousAnswer,
                question_focus: questionFocus
            };
            
            return await this.generateResponse('requirements_clarification', context);
        },
        
        // Generate personalized requirements summary
        generateRequirementsSummary: async function(requirements, productData) {
            const context = {
                product_name: productData?.name || 'this product',
                product_category: detectProductCategory(productData),
                requirements_json: JSON.stringify(requirements, null, 2)
            };
            
            return await this.generateResponse('requirements_summary', context);
        },
        
        // Generate search progress messages
        generateSearchProgress: async function(searchTerms, requirements, productData) {
            const context = {
                product_name: productData?.name || 'this product',
                product_category: detectProductCategory(productData),
                search_terms: Array.isArray(searchTerms) ? searchTerms.join(', ') : searchTerms,
                requirements_focus: this.extractRequirementsFocus(requirements)
            };
            
            return await this.generateResponse('search_progress', context);
        },
        
        // Extract key focus from requirements for messaging
        extractRequirementsFocus: function(requirements) {
            const focuses = [];
            
            if (requirements.priceRange) {
                focuses.push('budget-conscious options');
            }
            
            if (requirements.mustHaveFeatures && requirements.mustHaveFeatures.length > 0) {
                focuses.push(`${requirements.mustHaveFeatures.join(' and ')} features`);
            }
            
            if (requirements.brandPreferences && requirements.brandPreferences.length > 0) {
                focuses.push(`${requirements.brandPreferences.join(' or ')} brands`);
            }
            
            if (requirements.useCase) {
                focuses.push(`${requirements.useCase} applications`);
            }
            
            return focuses.length > 0 ? focuses.join(', ') : 'your specific needs';
        }
    };
    
    // Enhanced willingness response with intelligent generation
    async function handleEnhancedWillingnessResponse(response) {
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
            
            // Generate intelligent explanation using LLM
            const context = {
                product_name: enhancedConversationState.productData?.name || 'this product',
                product_category: detectProductCategory(enhancedConversationState.productData)
            };
            
            const intelligentResponse = await INTELLIGENT_RESPONSES.generateResponse('willingness_explanation', context);
            addChatMessage(intelligentResponse);
        } else {
            // Generate contextual clarification
            const context = {
                product_name: enhancedConversationState.productData?.name || 'this product',
                product_category: detectProductCategory(enhancedConversationState.productData)
            };
            
            const clarification = await INTELLIGENT_RESPONSES.generateResponse('willingness_explanation', context);
            addChatMessage(`${clarification} Would you like me to help find alternates?`);
        }
    }
    
    // Enhanced guided requirements with intelligent follow-ups
    async function handleGuidedRequirements(response) {
        const questions = ENHANCED_CONVERSATION_STEPS.REQUIREMENTS_GATHERING.subQuestions;
        const currentQ = enhancedConversationState.currentQuestion;
        
        // Store the response based on question type
        storeRequirementResponse(currentQ, response);
        
        // Move to next question or finish
        enhancedConversationState.currentQuestion++;
        
        if (enhancedConversationState.currentQuestion < questions.length) {
            const nextQ = enhancedConversationState.currentQuestion;
            
            // Generate intelligent follow-up question based on previous answer
            const questionFocus = getQuestionFocus(nextQ);
            const followUpQuestion = await INTELLIGENT_RESPONSES.generateFollowUpQuestion(
                response, 
                questionFocus, 
                enhancedConversationState.productData
            );
            
            addChatMessage(`**Question ${nextQ + 1} of ${questions.length}:** ${followUpQuestion}`);
        } else {
            // All questions answered, process requirements with intelligent summary
            enhancedConversationState.step = 'PROCESS_REQUIREMENTS';
            
            // Generate intelligent requirements summary
            const intelligentSummary = await INTELLIGENT_RESPONSES.generateRequirementsSummary(
                enhancedConversationState.requirements,
                enhancedConversationState.productData
            );
            
            addChatMessage(intelligentSummary);
            
            setTimeout(() => {
                processEnhancedRequirements();
            }, 2000);
        }
    }
    
    // Get question focus for intelligent follow-ups
    function getQuestionFocus(questionIndex) {
        const focuses = [
            'use case and applications',
            'essential features and functionality', 
            'budget and pricing preferences',
            'brand preferences and exclusions',
            'technical specifications and requirements'
        ];
        
        return focuses[questionIndex] || 'specific requirements';
    }
    
    // Enhanced requirements processing with intelligent messaging
    async function processEnhancedRequirements() {
        log('Processing enhanced requirements with intelligent LLM responses:', enhancedConversationState.requirements);
        
        try {
            // Use LLM to process requirements if available
            const llmResult = await processRequirementsWithLLM(enhancedConversationState.requirements);
            
            if (llmResult.success) {
                // Merge LLM results with existing requirements
                enhancedConversationState.requirements = {
                    ...enhancedConversationState.requirements,
                    ...llmResult.requirements,
                    llmProcessed: true,
                    processedAt: new Date().toISOString()
                };
                
                // Generate search terms with LLM
                const searchTermsResult = await generateSearchTermsWithLLM(enhancedConversationState.requirements);
                
                if (searchTermsResult.success) {
                    enhancedConversationState.searchTerms = searchTermsResult.searchTerms;
                    
                    // Generate intelligent search progress message
                    const searchProgressMessage = await INTELLIGENT_RESPONSES.generateSearchProgress(
                        searchTermsResult.searchTerms,
                        enhancedConversationState.requirements,
                        enhancedConversationState.productData
                    );
                    
                    addChatMessage(searchProgressMessage);
                } else {
                    addChatMessage("I'm analyzing your requirements to find the best alternates...");
                }
                
            } else if (llmResult.fallback) {
                // Fall back to original processing with intelligent message
                const fallbackMessage = await INTELLIGENT_RESPONSES.generateResponse('search_progress', {
                    product_name: enhancedConversationState.productData?.name || 'this product',
                    product_category: detectProductCategory(enhancedConversationState.productData),
                    search_terms: 'standard search methods',
                    requirements_focus: 'your specified requirements'
                });
                
                addChatMessage(fallbackMessage);
            } else {
                addChatMessage(`Processing your requirements... (${llmResult.error})`);
            }
            
        } catch (error) {
            log('Error in intelligent requirements processing:', error);
            addChatMessage("I'm analyzing your requirements to find suitable alternates...");
        }
        
        // Continue with existing flow
        setTimeout(() => {
            enhancedConversationState.step = 'PRESENT_ALTERNATES';
            
            // Generate intelligent "no results" message since search isn't implemented yet
            INTELLIGENT_RESPONSES.generateResponse('no_results_encouragement', {
                product_name: enhancedConversationState.productData?.name || 'this product',
                product_category: detectProductCategory(enhancedConversationState.productData),
                requirements_summary: generateContextAwareRequirementsSummary(),
                search_attempted: 'comprehensive product database search'
            }).then(message => {
                addChatMessage(message);
                
                if (enhancedConversationState.approach === 'both' || enhancedConversationState.approach === 'guided') {
                    showManualASINSection();
                    showAlternatesSelection();
                }
            }).catch(error => {
                log('Error generating no results message:', error);
                addChatMessage("I didn't find perfect matches in my initial search, but you can add specific ASINs if you have alternates in mind, or we can try a broader search approach.");
                
                if (enhancedConversationState.approach === 'both' || enhancedConversationState.approach === 'guided') {
                    showManualASINSection();
                    showAlternatesSelection();
                }
            });
            
        }, 3000);
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
        
        // Ensure requirements object is initialized
        if (!enhancedConversationState.requirements) {
            enhancedConversationState.requirements = {
                useCase: '',
                mustHaveFeatures: [],
                priceRange: null,
                brandPreferences: [],
                brandExclusions: [],
                technicalSpecs: [],
                keywords: []
            };
        }
        
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
    
    // Enhanced conversation processing with dynamic adaptation
    async function processEnhancedUserInput(userInput) {
        const currentStep = ENHANCED_CONVERSATION_STEPS[enhancedConversationState.step];
        
        if (!currentStep) {
            log('Error: Invalid conversation step:', enhancedConversationState.step);
            return;
        }
        
        // Track step progression
        const previousStep = enhancedConversationState.step;
        
        // Add user message to chat
        addChatMessage(userInput, true);
        
        // Process based on step type and context
        try {
            switch (enhancedConversationState.step) {
                case 'WILLINGNESS_CHECK':
                    await handleEnhancedWillingnessResponse(userInput);
                    break;
                    
                case 'EXPLAIN_BENEFITS':
                    handleBenefitsResponse(userInput);
                    break;
                    
                case 'DETERMINE_APPROACH':
                    handleApproachSelection(userInput);
                    break;
                    
                case 'REQUIREMENTS_GATHERING':
                    await handleGuidedRequirements(userInput);
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
        } catch (error) {
            log('Error processing user input:', error);
            addChatMessage("I encountered an error processing your response. Please try again.", false);
        }
        
        // Track step progression if step changed
        if (previousStep !== enhancedConversationState.step) {
            CONVERSATION_ANALYTICS.trackStepProgression(previousStep, enhancedConversationState.step, userInput);
        }
    }
    
    // Process user input based on current conversation step (updated for enhanced system)
    function processUserInput(userInput) {
        // Use enhanced conversation processing (async)
        processEnhancedUserInput(userInput).catch(error => {
            log('Error in enhanced conversation processing:', error);
            addChatMessage("I encountered an error processing your response. Please try again.", false);
        });
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
    
    // Process requirements (placeholder for LLM integration)
    function processRequirements(requirements) {
        log('Processing requirements:', requirements);
        
        // TODO: Integrate with LLM service in Phase 3
        // For now, simulate finding alternates
        enhancedConversationState.step = 'PRESENT_ALTERNATES';
        
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
    
    // Update manual ASINs list display
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
    
    // Remove manual ASIN
    function removeManualASIN(asin) {
        enhancedConversationState.selectedAlternates = enhancedConversationState.selectedAlternates.filter(alt => alt.asin !== asin);
        updateManualASINsList();
        updateConfirmButton();
        addChatMessage(`Removed ASIN ${asin} from your alternates list.`, false);
        log('Manual ASIN removed:', asin);
    }
    
    // Update confirm button state
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
        enhancedConversationState = {
            step: 'WILLINGNESS_CHECK',
            productData: productData,
            requirements: {
                useCase: '',
                mustHaveFeatures: [],
                priceRange: null,
                brandPreferences: [],
                brandExclusions: [],
                technicalSpecs: [],
                keywords: []
            },
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
        if (enhancedConversationState.selectedAlternates.length === 0) {
            addChatMessage("No alternates selected. Please add some ASINs first.", false);
            return;
        }
        
        log('Confirming alternates:', enhancedConversationState.selectedAlternates);
        
        // TODO: Integrate with CQE API in Phase 5
        // For now, just show success message
        addChatMessage(`Great! I've recorded ${enhancedConversationState.selectedAlternates.length} alternate ASIN${enhancedConversationState.selectedAlternates.length > 1 ? 's' : ''} for your request. This information will be shared with suppliers to help them provide better quotes.`, false);
        
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
    
    // Add "Add Alternates" button near the ASIN input form (enhanced with better detection)
    function addAlternatesButton() {
        log('=== Add Alternates Button Placement (Enhanced) ===');
        
        // Check if button already exists
        const existingButton = document.querySelector('#cqe-add-alternates-btn');
        if (existingButton) {
            log('Add Alternates button already exists');
            return existingButton;
        }
        
        // Multiple strategies to find placement location
        let targetElement = null;
        let placementStrategy = '';
        
        // Strategy 1: Find Add Item button (primary target)
        const addItemButton = document.querySelector('#add-item-btn');
        if (addItemButton) {
            targetElement = addItemButton;
            placementStrategy = 'after-add-item-button';
            log('Strategy 1: Found Add Item button');
        }
        
        // Strategy 2: Find any submit button
        if (!targetElement) {
            const submitButtons = document.querySelectorAll('button[type="submit"]');
            if (submitButtons.length > 0) {
                targetElement = submitButtons[0];
                placementStrategy = 'after-submit-button';
                log('Strategy 2: Found submit button');
            }
        }
        
        // Strategy 3: Find button with "Add" text
        if (!targetElement) {
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
                if (btn.textContent && btn.textContent.toLowerCase().includes('add')) {
                    targetElement = btn;
                    placementStrategy = 'after-add-button';
                    log('Strategy 3: Found button with "Add" text:', btn.textContent.trim());
                    break;
                }
            }
        }
        
        // Strategy 4: Find ASIN input and place button nearby
        if (!targetElement) {
            const asinInput = document.querySelector('#add-asin-or-isbn-form') || 
                             document.querySelector('input[placeholder*="ASIN"]') ||
                             document.querySelector('input[placeholder*="ISBN"]');
            if (asinInput) {
                targetElement = asinInput;
                placementStrategy = 'after-asin-input';
                log('Strategy 4: Found ASIN input field');
            }
        }
        
        // Strategy 5: Find any input field as last resort
        if (!targetElement) {
            const anyInput = document.querySelector('input[type="text"]') || 
                            document.querySelector('input');
            if (anyInput) {
                targetElement = anyInput;
                placementStrategy = 'after-any-input';
                log('Strategy 5: Found any input field');
            }
        }
        
        // If still no target found, give up
        if (!targetElement) {
            log('❌ Could not find any suitable element for button placement');
            return null;
        }
        
        log('✅ Target element found:', targetElement);
        log('Placement strategy:', placementStrategy);
        log('Target element classes:', targetElement.className);
        log('Target element parent:', targetElement.parentElement);
        
        // Create the Add Alternates button
        const alternatesButton = document.createElement('button');
        alternatesButton.id = 'cqe-add-alternates-btn';
        alternatesButton.type = 'button';
        alternatesButton.textContent = 'Add Alternates';
        
        // Apply styling based on target element
        if (targetElement.tagName === 'BUTTON') {
            // Copy exact styling from target button (Add Item button)
            alternatesButton.className = targetElement.className;
            
            // Add spacing
            alternatesButton.style.marginLeft = '0.5rem';
        } else {
            // Default styling for non-button targets
            alternatesButton.className = 'b-button';
            alternatesButton.style.cssText = `
                margin: 0.5rem;
                padding: 8px 16px;
            `;
        }
        
        // Add click handler
        alternatesButton.addEventListener('click', handleAddAlternatesClick);
        
        // Place button based on strategy
        try {
            switch (placementStrategy) {
                case 'after-add-item-button':
                case 'after-submit-button':
                case 'after-add-button':
                    // Insert after the button
                    targetElement.parentNode.insertBefore(alternatesButton, targetElement.nextSibling);
                    break;
                    
                case 'after-asin-input':
                case 'after-any-input':
                    // Insert after the input, or in its container
                    if (targetElement.nextSibling) {
                        targetElement.parentNode.insertBefore(alternatesButton, targetElement.nextSibling);
                    } else {
                        targetElement.parentNode.appendChild(alternatesButton);
                    }
                    break;
                    
                default:
                    // Fallback: append to parent
                    targetElement.parentNode.appendChild(alternatesButton);
            }
            
            log('✅ Add Alternates button placed successfully using strategy:', placementStrategy);
            log('Button element:', alternatesButton);
            log('Button classes:', alternatesButton.className);
            
            // Verify button is visible
            setTimeout(() => {
                const isVisible = alternatesButton.offsetWidth > 0 && alternatesButton.offsetHeight > 0;
                log('Button visibility check:', isVisible);
                if (!isVisible) {
                    log('⚠️ Button may not be visible, checking styles...');
                    log('Button computed styles:', {
                        display: getComputedStyle(alternatesButton).display,
                        visibility: getComputedStyle(alternatesButton).visibility,
                        opacity: getComputedStyle(alternatesButton).opacity
                    });
                }
            }, 100);
            
            return alternatesButton;
            
        } catch (error) {
            log('❌ Error placing button:', error);
            return null;
        }
    }
    
    // Enhanced manual button addition for testing with exact styling
    window.forceAddAlternatesButton = function() {
        console.log('=== Force Adding Alternates Button (Enhanced) ===');
        
        // Remove existing button if present
        const existing = document.querySelector('#cqe-add-alternates-btn');
        if (existing) {
            existing.remove();
            console.log('Removed existing button');
        }
        
        // Try multiple strategies to find a good placement location
        let targetElement = null;
        let strategy = '';
        
        // Strategy 1: Find Add Item button
        const addItemButton = document.querySelector('#add-item-btn');
        if (addItemButton) {
            targetElement = addItemButton;
            strategy = 'add-item-button';
            console.log('✅ Found Add Item button');
        }
        
        // Strategy 2: Find any button with "add" in text
        if (!targetElement) {
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
                if (btn.textContent && btn.textContent.toLowerCase().includes('add')) {
                    targetElement = btn;
                    strategy = 'add-text-button';
                    console.log('✅ Found button with "add" text:', btn.textContent.trim());
                    break;
                }
            }
        }
        
        // Strategy 3: Find any submit button
        if (!targetElement) {
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) {
                targetElement = submitBtn;
                strategy = 'submit-button';
                console.log('✅ Found submit button');
            }
        }
        
        // Strategy 4: Find any button
        if (!targetElement) {
            const anyButton = document.querySelector('button');
            if (anyButton) {
                targetElement = anyButton;
                strategy = 'any-button';
                console.log('✅ Found any button');
            }
        }
        
        // Strategy 5: Find input field
        if (!targetElement) {
            const input = document.querySelector('input[type="text"]') || document.querySelector('input');
            if (input) {
                targetElement = input;
                strategy = 'input-field';
                console.log('✅ Found input field');
            }
        }
        
        // Strategy 6: Use body as last resort
        if (!targetElement) {
            targetElement = document.body;
            strategy = 'body-fallback';
            console.log('⚠️ Using body as fallback');
        }
        
        console.log('Using strategy:', strategy);
        console.log('Target element:', targetElement);
        
        // Create button with enhanced styling
        const button = document.createElement('button');
        button.id = 'cqe-add-alternates-btn';
        button.type = 'button';
        button.textContent = 'Add Alternates';
        
        // Apply styling based on target
        if (targetElement.tagName === 'BUTTON') {
            // Copy exact classes from target button (Add Item button)
            button.className = targetElement.className;
            button.style.marginLeft = '0.5rem';
        } else {
            // Use prominent styling for non-button targets
            button.className = 'b-button';
            button.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 12px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                transition: all 0.2s ease;
            `;
        }
        
        // Add hover effects
        button.addEventListener('mouseenter', () => {
            if (targetElement.tagName === 'BUTTON') {
                button.style.backgroundColor = '#f0f8ff';
            } else {
                button.style.backgroundColor = '#e88900';
                button.style.transform = 'scale(1.05)';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            if (targetElement.tagName === 'BUTTON') {
                button.style.backgroundColor = '';
            } else {
                button.style.backgroundColor = '#ff9900';
                button.style.transform = 'scale(1)';
            }
        });
        
        // Add click handler
        button.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎯 Add Alternates button clicked!');
            
            // Try to get ASIN from input field
            const asinInput = document.querySelector('#add-asin-or-isbn-form') || 
                             document.querySelector('input[type="text"]');
            const asin = asinInput?.value || 'B00V5D4VX8'; // fallback ASIN for testing
            
            const productData = {
                id: 'test-' + Date.now(),
                asin: asin,
                name: `Test Product ${asin}`,
                quantity: '1',
                unitPrice: '10.00'
            };
            
            console.log('Opening modal with product data:', productData);
            openModal(productData);
        });
        
        // Place button based on strategy
        try {
            if (strategy === 'body-fallback') {
                // Fixed position for body fallback
                document.body.appendChild(button);
            } else if (targetElement.tagName === 'BUTTON') {
                // Insert after target button
                targetElement.parentNode.insertBefore(button, targetElement.nextSibling);
            } else {
                // Insert after target element
                if (targetElement.nextSibling) {
                    targetElement.parentNode.insertBefore(button, targetElement.nextSibling);
                } else {
                    targetElement.parentNode.appendChild(button);
                }
            }
            
            console.log('✅ Add Alternates button force-added successfully!');
            console.log('Strategy used:', strategy);
            console.log('Button classes:', button.className);
            console.log('Button element:', button);
            
            // Highlight button temporarily
            const originalBg = button.style.backgroundColor;
            button.style.boxShadow = '0 0 15px #ff6b6b';
            setTimeout(() => {
                button.style.boxShadow = '';
            }, 3000);
            
            return button;
            
        } catch (error) {
            console.log('❌ Error placing button:', error);
            
            // Ultimate fallback - fixed position
            button.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                padding: 12px 20px;
                background: #ff6b6b;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            `;
            
            document.body.appendChild(button);
            console.log('✅ Button added with ultimate fallback (fixed position)');
            
            return button;
        }
    };
    
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
            alternatesButton.className = addItemButton.className; // Copy exact classes from Add Item button
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
            alternatesButton.className = 'b-button'; // Use solid button style like Add Item button
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
    
    // Enhanced initialization with proper DOM ready handling
    function initializeWhenReady() {
        log('Starting enhanced initialization...');
        
        // Check if we're on the correct page
        if (!isCQEQuotePage()) {
            log('Not on CQE quote page, skipping initialization');
            return;
        }
        
        // Function to check if required elements are available
        function checkRequiredElements() {
            const asinForm = document.querySelector('#add-asin-or-isbn-form');
            const addItemBtn = document.querySelector('#add-item-btn');
            const pageHeader = document.querySelector('#cqe_quote_request_a_quote_header');
            
            log('Element check:', {
                asinForm: !!asinForm,
                addItemBtn: !!addItemBtn,
                pageHeader: !!pageHeader
            });
            
            return asinForm || addItemBtn || pageHeader;
        }
        
        // Function to perform initialization
        function performInitialization() {
            log('Performing initialization...');
            
            try {
                // Add modal HTML to page
                addModalHTML();
                
                // Add button near ASIN input
                addAlternatesButton();
                
                // Set up event listeners
                setupEventListeners();
                
                // Watch for changes to the form area
                const observer = new MutationObserver((mutations) => {
                    let shouldUpdate = false;
                    
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Check if the added node contains form elements
                                if (node.querySelector && (
                                    node.querySelector('#add-asin-or-isbn-form') ||
                                    node.querySelector('#add-item-btn') ||
                                    node.id === 'add-asin-or-isbn-form' ||
                                    node.id === 'add-item-btn'
                                )) {
                                    shouldUpdate = true;
                                }
                                // Or if the form container was updated
                                if (node.querySelector && node.querySelector('input, button')) {
                                    shouldUpdate = true;
                                }
                            }
                        });
                    });
                    
                    if (shouldUpdate) {
                        log('Form area updated, checking for button...');
                        setTimeout(() => {
                            const existingBtn = document.querySelector('#cqe-add-alternates-btn');
                            if (!existingBtn) {
                                log('Button missing after DOM change, re-adding...');
                                addAlternatesButton();
                            }
                        }, 100);
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
                
                log('Enhanced initialization complete');
                
                // Verify button was created
                setTimeout(() => {
                    const button = document.querySelector('#cqe-add-alternates-btn');
                    if (button) {
                        log('✅ Add Alternates button successfully created and visible');
                    } else {
                        log('⚠️ Add Alternates button not found after initialization - will retry');
                        // Force retry
                        setTimeout(() => {
                            log('Forcing button creation retry...');
                            addAlternatesButton();
                        }, 1000);
                    }
                }, 500);
                
            } catch (error) {
                log('Error during initialization:', error);
                // Retry after error
                setTimeout(() => {
                    log('Retrying initialization after error...');
                    addAlternatesButton();
                }, 2000);
            }
        }
        
        // Try immediate initialization if elements are ready
        if (checkRequiredElements()) {
            log('Elements ready, initializing immediately');
            performInitialization();
            return;
        }
        
        // Wait for DOM content to be loaded
        if (document.readyState === 'loading') {
            log('Waiting for DOM content loaded...');
            document.addEventListener('DOMContentLoaded', () => {
                log('DOM content loaded');
                setTimeout(() => {
                    if (checkRequiredElements()) {
                        performInitialization();
                    } else {
                        log('Elements still not ready after DOMContentLoaded, trying with delay...');
                        setTimeout(() => {
                            performInitialization(); // Force it anyway
                        }, 2000);
                    }
                }, 500);
            });
        } else {
            // DOM is already loaded, wait a bit and try again
            log('DOM already loaded, waiting for elements...');
            setTimeout(() => {
                if (checkRequiredElements()) {
                    performInitialization();
                } else {
                    log('Elements not ready, trying with longer delay...');
                    setTimeout(() => {
                        performInitialization(); // Force it anyway
                    }, 2000);
                }
            }, 1000);
        }
    }
    
    // Start enhanced initialization
    initializeWhenReady();
    
    // Manual retry function for debugging
    window.retryInitialization = function() {
        log('Manual retry requested');
        
        // Remove existing button if present
        const existing = document.querySelector('#cqe-add-alternates-btn');
        if (existing) {
            existing.remove();
            log('Removed existing button');
        }
        
        // Try initialization again
        setTimeout(() => {
            addAlternatesButton();
        }, 100);
    };
    
    // Additional fallback - retry every 2 seconds for the first 20 seconds if button is missing
    let retryCount = 0;
    const maxRetries = 10; // 10 retries over 20 seconds
    
    const retryInterval = setInterval(() => {
        retryCount++;
        
        if (retryCount > maxRetries) {
            clearInterval(retryInterval);
            log('Stopped automatic retries after 20 seconds');
            
            // Final attempt with force placement
            log('Making final attempt with force placement...');
            window.forceAddAlternatesButton();
            return;
        }
        
        const button = document.querySelector('#cqe-add-alternates-btn');
        if (!button && isCQEQuotePage()) {
            log(`Automatic retry ${retryCount}/${maxRetries} - button not found, attempting to add...`);
            const result = addAlternatesButton();
            if (result) {
                log('✅ Button successfully added on retry', retryCount);
                clearInterval(retryInterval);
            }
        } else if (button) {
            log('✅ Button found, stopping automatic retries');
            clearInterval(retryInterval);
        }
    }, 2000); // Every 2 seconds
    
    // LLM Error Handling and Fallback System
    const LLM_FALLBACK_SYSTEM = {
        // Circuit breaker for LLM service reliability
        circuitBreaker: {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failureCount: 0,
            failureThreshold: 5,
            timeout: 60000, // 1 minute
            lastFailureTime: null
        },
        
        // Static fallback responses
        STATIC_FALLBACKS: {
            willingness_explanation: [
                "Alternates can help you get better pricing, improved availability, or features that better match your needs.",
                "Finding alternates gives you more options and helps suppliers provide competitive quotes."
            ],
            requirements_clarification: [
                "Could you tell me more about what's most important to you in this product?",
                "What specific features or qualities matter most for your needs?"
            ],
            search_progress: [
                "Searching for suitable alternates based on your requirements...",
                "Looking for products that match your specifications..."
            ]
        },
        
        // Handle LLM errors gracefully
        handleError: function(error, context = {}) {
            log('LLM Error handled with fallback:', error.message);
            
            CONVERSATION_ANALYTICS.trackUserAction('llm_error_fallback', {
                error: error.message,
                context: context.responseType
            });
            
            return this.getFallbackResponse(context);
        },
        
        // Get appropriate fallback response
        getFallbackResponse: function(context) {
            const responses = this.STATIC_FALLBACKS[context.responseType] || 
                            this.STATIC_FALLBACKS.requirements_clarification;
            return responses[Math.floor(Math.random() * responses.length)];
        },
        
        // Update circuit breaker state
        updateCircuitBreaker: function(success) {
            if (success) {
                this.circuitBreaker.failureCount = Math.max(0, this.circuitBreaker.failureCount - 1);
                if (this.circuitBreaker.state === 'OPEN' && this.circuitBreaker.failureCount === 0) {
                    this.circuitBreaker.state = 'CLOSED';
                    log('LLM circuit breaker closed - service recovered');
                }
            } else {
                this.circuitBreaker.failureCount++;
                if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
                    this.circuitBreaker.state = 'OPEN';
                    log('LLM circuit breaker opened - service temporarily disabled');
                    
                    // Auto-recovery after timeout
                    setTimeout(() => {
                        this.circuitBreaker.state = 'CLOSED';
                        this.circuitBreaker.failureCount = 0;
                    }, this.circuitBreaker.timeout);
                }
            }
        }
    };
    
    // Enhanced LLM request with error handling
    async function makeLLMRequestWithFallback(prompt, options = {}, context = {}) {
        if (LLM_FALLBACK_SYSTEM.circuitBreaker.state === 'OPEN') {
            return {
                success: false,
                response: LLM_FALLBACK_SYSTEM.getFallbackResponse(context),
                fallback: true
            };
        }
        
        try {
            const response = await BEDROCK_AGENT_INTEGRATION.makeRequest(prompt, options);
            
            if (response.success) {
                LLM_FALLBACK_SYSTEM.updateCircuitBreaker(true);
                return response;
            } else {
                LLM_FALLBACK_SYSTEM.updateCircuitBreaker(false);
                return {
                    success: false,
                    response: LLM_FALLBACK_SYSTEM.handleError(new Error(response.error), context),
                    fallback: true
                };
            }
        } catch (error) {
            LLM_FALLBACK_SYSTEM.updateCircuitBreaker(false);
            return {
                success: false,
                response: LLM_FALLBACK_SYSTEM.handleError(error, context),
                fallback: true
            };
        }
    }
    
    // Test Bedrock Agent integration function
    async function testLLMIntegration() {
        console.log('Testing Bedrock Agent integration...');
        
        try {
            const testPrompt = "Test prompt for requirements extraction: I need a durable, waterproof device under $50";
            const result = await processRequirementsWithLLM(testPrompt);
            
            console.log('LLM Test Result:', result);
            
            if (result.success) {
                console.log('✅ Bedrock Agent integration working correctly');
            } else {
                console.log('⚠️ Bedrock Agent integration failed:', result.error);
            }
            
            // Test intelligent response generation
            console.log('Testing intelligent response generation...');
            const responseTest = await INTELLIGENT_RESPONSES.generateResponse('willingness_explanation', {
                product_name: 'Test Product',
                product_category: 'electronics'
            });
            
            console.log('Intelligent Response Test:', responseTest);
            
        } catch (error) {
            console.log('❌ Bedrock Agent integration error:', error);
        }
    }
    
})();
