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
        
        // TODO: Open modal interface (Task 1.2)
        alert(`Add Alternates clicked for: ${productData.name}\nASIN: ${productData.asin}\nQuantity: ${productData.quantity}`);
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
