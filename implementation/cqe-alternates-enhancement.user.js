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
                                   placeholder="Enter ASIN (e.g., B08N5WRWNW)">
                            <button id="cqe-add-asin" class="b-button b-outline">Add ASIN</button>
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
        
        // Chat input handlers (placeholder for Task 1.3)
        document.addEventListener('keypress', (e) => {
            if (e.target.matches('#cqe-chat-input') && e.key === 'Enter') {
                // TODO: Implement chat functionality in Task 1.3
                log('Chat input detected - will implement in Task 1.3');
            }
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.matches('#cqe-chat-send')) {
                // TODO: Implement chat functionality in Task 1.3
                log('Chat send clicked - will implement in Task 1.3');
            }
        });
    }
    
    // Open modal with product context
    function openModal(productData) {
        let modal = document.querySelector('#cqe-alternates-modal');
        
        // Create modal if it doesn't exist
        if (!modal) {
            modal = createModal();
        }
        
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
