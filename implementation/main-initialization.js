// ==UserScript==
// @name         CQE Main Initialization Module
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  Main initialization and page detection for CQE Alternates Enhancement
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Main initialization functionality
    window.CQE_MAIN = {
        // Check if we're on the correct CQE page
        isCQEQuotePage: function() {
            const header = document.querySelector(window.CQE_SELECTORS ? window.CQE_SELECTORS.pageHeader : '#cqe_quote_request_a_quote_header');
            const breadcrumb = document.querySelector('.b-breadcrumb');
            
            if (header && header.textContent.includes('Request a quote')) {
                window.log('CQE Quote Request page detected');
                return true;
            }
            
            if (breadcrumb && breadcrumb.textContent.includes('Bulk ordering')) {
                window.log('CQE Bulk ordering page detected via breadcrumb');
                return true;
            }
            
            return false;
        },

        // Extract product data from a table row
        extractProductData: function(rowElement) {
            try {
                const rowKey = rowElement.getAttribute('data-key');
                window.log('Extracting data for row key:', rowKey);
                
                // Try multiple methods to get ASIN
                let asin = '';
                
                // Method 1: From the main ASIN input field
                const asinInput = document.querySelector(window.CQE_SELECTORS ? window.CQE_SELECTORS.asinInput : '#add-asin-or-isbn-form');
                if (asinInput && asinInput.value) {
                    asin = asinInput.value.trim();
                    window.log('ASIN from input field:', asin);
                }
                
                // Method 2: From data attributes on the row
                if (!asin) {
                    const dataAttrs = Array.from(rowElement.attributes)
                        .filter(attr => attr.name.includes('asin') || attr.name.includes('product'))
                        .map(attr => ({ name: attr.name, value: attr.value }));
                    window.log('Row data attributes:', dataAttrs);
                    
                    // Check for ASIN in data attributes
                    for (const attr of dataAttrs) {
                        const extractedASIN = window.ASIN_VALIDATION ? window.ASIN_VALIDATION.extract(attr.value) : null;
                        if (extractedASIN) {
                            asin = extractedASIN;
                            window.log('ASIN from data attribute:', attr.name, '=', extractedASIN);
                            break;
                        }
                    }
                }
                
                // Method 3: From links or images in the row
                if (!asin) {
                    const links = rowElement.querySelectorAll('a[href]');
                    for (const link of links) {
                        const extractedASIN = window.ASIN_VALIDATION ? window.ASIN_VALIDATION.extract(link.href) : null;
                        if (extractedASIN) {
                            asin = extractedASIN;
                            window.log('ASIN from link href:', extractedASIN);
                            break;
                        }
                    }
                }
                
                // Method 4: From image src
                if (!asin) {
                    const img = rowElement.querySelector('img[src]');
                    if (img && img.src) {
                        const extractedASIN = window.ASIN_VALIDATION ? window.ASIN_VALIDATION.extract(img.src) : null;
                        if (extractedASIN) {
                            asin = extractedASIN;
                            window.log('ASIN from image src:', extractedASIN);
                        }
                    }
                }
                
                // Method 5: From text content (last resort)
                if (!asin) {
                    const textContent = rowElement.textContent;
                    const asinMatch = textContent.match(/\b[A-Z0-9]{10}\b/g);
                    if (asinMatch) {
                        for (const match of asinMatch) {
                            const validation = window.ASIN_VALIDATION ? window.ASIN_VALIDATION.validate(match) : { valid: false };
                            if (validation.valid) {
                                asin = validation.asin;
                                window.log('ASIN from text content:', asin);
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
                        window.log('Product name from selector', selector, ':', productName);
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
                            window.log('Quantity from selector', selector, ':', quantity);
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
                
                window.log('Final extracted product data:', productData);
                
                // Warn if critical data is missing
                if (!productData.asin) {
                    window.log('WARNING: No ASIN found for product row');
                    console.warn('CQE Alternates: No ASIN detected. Row HTML:', rowElement.outerHTML.substring(0, 500) + '...');
                }
                
                if (!productData.name || productData.name === 'Unknown Product') {
                    window.log('WARNING: No product name found');
                }
                
                return productData;
            } catch (error) {
                window.log('Error extracting product data:', error);
                console.error('CQE Alternates: Product data extraction failed:', error);
                return null;
            }
        },

        // Handle "Add Alternates" button click
        handleAddAlternatesClick: function(event) {
            event.preventDefault();
            window.log('🎯 Add Alternates button clicked!');
            
            // Try to get ASIN from input field
            const asinInput = document.querySelector('#add-asin-or-isbn-form') || 
                             document.querySelector('input[type="text"]');
            
            if (!asinInput) {
                this.showError('Could not find ASIN input field on the page.');
                return;
            }
            
            const asinValue = asinInput.value.trim();
            if (!asinValue) {
                this.showError('ASIN or ISBN required');
                // Focus on the ASIN input to guide user
                asinInput.focus();
                return;
            }
            
            // Validate ASIN format
            const validation = window.ASIN_VALIDATION ? window.ASIN_VALIDATION.validate(asinValue) : { valid: false, error: 'Validation not available' };
            if (!validation.valid) {
                this.showError(`Invalid ASIN format. ${validation.error}`);
                asinInput.focus();
                return;
            }
            
            // Clear any existing errors since validation passed
            this.clearError();
            
            const asin = validation.asin;
            
            // Get quantity if available
            const qtyInput = document.querySelector('#item-quantity') || 
                            document.querySelector('input[type="number"]');
            const quantity = qtyInput?.value || '';
            
            // Create product data object with real customer data
            const productData = {
                id: 'input-' + Date.now(),
                asin: asin,
                name: asin, // Use ASIN as name since we don't have product name from input
                quantity: quantity,
                source: 'asin-input'
            };
            
            window.log('Opening modal with customer product data:', productData);
            
            // Open modal interface
            if (window.MODAL_SYSTEM) {
                window.MODAL_SYSTEM.openModal(productData);
                
                // Initialize modal functionality after opening
                if (window.UI_COMPONENTS) {
                    setTimeout(() => {
                        // Check functions right before modal initialization
                        console.log('[CQE Alternates] 🔍 Function check before modal init:', {
                            'cqeRemoveManualASIN': typeof window.cqeRemoveManualASIN,
                            'cqeRemoveSelectedAlternate': typeof window.cqeRemoveSelectedAlternate
                        });
                        
                        // Ensure functions exist before initializing
                        if (window.ensureCQEGlobalFunctions) {
                            window.ensureCQEGlobalFunctions();
                        }
                        
                        window.UI_COMPONENTS.initializeModalFunctionality();
                        
                        // Check functions right after modal initialization
                        setTimeout(() => {
                            console.log('[CQE Alternates] 🔍 Function check after modal init:', {
                                'cqeRemoveManualASIN': typeof window.cqeRemoveManualASIN,
                                'cqeRemoveSelectedAlternate': typeof window.cqeRemoveSelectedAlternate
                            });
                        }, 50);
                    }, 100);
                }
            }
        },

        // Helper function to show error messages matching CQE styling
        showError: function(message) {
            // Find the ASIN input field
            const asinInput = document.querySelector('#add-asin-or-isbn-form');
            if (!asinInput) {
                window.log('Could not find ASIN input field for error display');
                return;
            }
            
            // Add error class to input field (matches CQE pattern)
            asinInput.classList.add('is-error');
            asinInput.setAttribute('aria-invalid', 'true');
            
            // Find or create error span element
            let errorSpan = document.querySelector('#add-asin-or-isbn-form-error');
            
            if (!errorSpan) {
                // Create error span matching CQE pattern
                errorSpan = document.createElement('span');
                errorSpan.id = 'add-asin-or-isbn-form-error';
                errorSpan.setAttribute('role', 'alert');
                errorSpan.className = 'b-error is-error';
                
                // Insert after the input field
                asinInput.parentNode.insertBefore(errorSpan, asinInput.nextSibling);
            }
            
            // Set error message and make visible
            errorSpan.textContent = message;
            errorSpan.classList.add('is-error');
            
            // Update aria-describedby on input
            asinInput.setAttribute('aria-describedby', 'add-asin-or-isbn-form-error');
            
            // Hide error after 5 seconds
            setTimeout(() => {
                this.clearError();
            }, 5000);
            
            window.log('Error shown to user:', message);
        },

        // Helper function to clear error state
        clearError: function() {
            const asinInput = document.querySelector('#add-asin-or-isbn-form');
            const errorSpan = document.querySelector('#add-asin-or-isbn-form-error');
            
            if (asinInput) {
                asinInput.classList.remove('is-error');
                asinInput.removeAttribute('aria-invalid');
                asinInput.removeAttribute('aria-describedby');
            }
            
            if (errorSpan) {
                errorSpan.classList.remove('is-error');
                errorSpan.textContent = '';
            }
        },

        // Add "Add Alternates" button near the ASIN input form
        addAlternatesButton: function() {
            // Check if button already exists
            const existingButton = document.querySelector('#cqe-add-alternates-btn');
            if (existingButton) {
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
            }
            
            // Strategy 2: Find any submit button
            if (!targetElement) {
                const submitButtons = document.querySelectorAll('button[type="submit"]');
                if (submitButtons.length > 0) {
                    targetElement = submitButtons[0];
                    placementStrategy = 'after-submit-button';
                }
            }
            
            // Strategy 3: Find button with "Add" text
            if (!targetElement) {
                const allButtons = document.querySelectorAll('button');
                for (const btn of allButtons) {
                    if (btn.textContent && btn.textContent.toLowerCase().includes('add')) {
                        targetElement = btn;
                        placementStrategy = 'after-add-button';
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
                }
            }
            
            // Strategy 5: Find any input field as last resort
            if (!targetElement) {
                const anyInput = document.querySelector('input[type="text"]') || 
                                document.querySelector('input');
                if (anyInput) {
                    targetElement = anyInput;
                    placementStrategy = 'after-any-input';
                }
            }
            
            // If still no target found, give up
            if (!targetElement) {
                return null;
            }
            
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
            alternatesButton.addEventListener('click', (e) => this.handleAddAlternatesClick(e));
            
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
                
                
                // Verify button is visible
                setTimeout(() => {
                    const isVisible = alternatesButton.offsetWidth > 0 && alternatesButton.offsetHeight > 0;
                }, 100);
                
                return alternatesButton;
                
            } catch (error) {
                window.log('❌ Error placing button:', error);
                return null;
            }
        },

        // Initialize the enhancement
        initialize: function() {
            window.log('Initializing CQE Alternates Enhancement...');
            
            if (!this.isCQEQuotePage()) {
                window.log('Not on CQE quote page, skipping initialization');
                return;
            }
            
            // Wait for page to be fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initialize());
                return;
            }
            
            // Add modal styles and spinner CSS
            if (window.MODAL_SYSTEM) {
                window.MODAL_SYSTEM.addModalStyles();
                window.MODAL_SYSTEM.addSpinnerCSS();
            }
            
            // Add button near ASIN input
            this.addAlternatesButton();
            
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
                    window.log('Form area updated, checking for button...');
                    setTimeout(() => this.addAlternatesButton(), 100); // Small delay to ensure DOM is ready
                }
            });
            
            // Start observing the main container
            const mainContainer = document.querySelector('.b-container') || document.body;
            if (mainContainer) {
                observer.observe(mainContainer, {
                    childList: true,
                    subtree: true
                });
            }
            
        }
    };

    // Debug function
    window.debugCQEAlternates = function() {
        console.log('=== CQE Alternates Debug Info ===');
        
        // Check page detection
        console.log('1. Page Detection:');
        console.log('   Is CQE page:', window.CQE_MAIN.isCQEQuotePage());
        
        // Check ASIN input
        console.log('2. ASIN Input:');
        const asinInput = document.querySelector('#add-asin-or-isbn-form');
        console.log('   ASIN input element:', asinInput);
        console.log('   ASIN input value:', asinInput?.value);
        
        // Check for our button
        console.log('3. Add Alternates Button:');
        const ourButton = document.querySelector('#cqe-add-alternates-btn');
        console.log('   Add Alternates button:', ourButton);
        
        // Check modules
        console.log('4. Module Status:');
        console.log('   CQE_SELECTORS:', !!window.CQE_SELECTORS);
        console.log('   ASIN_VALIDATION:', !!window.ASIN_VALIDATION);
        console.log('   MODAL_SYSTEM:', !!window.MODAL_SYSTEM);
        console.log('   UI_COMPONENTS:', !!window.UI_COMPONENTS);
        console.log('   AMAZON_SEARCH_MODULE:', !!window.AMAZON_SEARCH_MODULE);
        console.log('   BEDROCK_AGENT_INTEGRATION:', !!window.BEDROCK_AGENT_INTEGRATION);
        
        console.log('=== End Debug Info ===');
        
        // Try to add button manually
        console.log('Attempting to add button...');
        window.CQE_MAIN.addAlternatesButton();
    };
    
    window.log('Main Initialization module loaded');
})();
