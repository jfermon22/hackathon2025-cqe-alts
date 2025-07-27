// ==UserScript==
// @name         CQE UI Components Module
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  UI components and interaction handlers for CQE Alternates Enhancement
// @author       Amazon
// @grant        none
// ==/UserScript==

'use strict';
    
    // Global storage for alternates by product
    window.PRODUCT_ALTERNATES_STORAGE = {};
    
    // UI Components and handlers
    window.UI_COMPONENTS = {
        // Global state for modal functionality
        manualAsins: new Set(),
        selectedAlternates: new Set(),
        originalAsin: null, // Store the original requested ASIN
        
        // Function to fetch product info from Amazon using ASIN
        fetchProductInfoFromASIN: async function(asin) {
            try {
                window.log(`🔍 Fetching product info for ASIN: ${asin}`);
                
                // Use existing Amazon search logic to get product info
                const amazonUrl = `https://www.amazon.com/dp/${asin}`;
                
                // Create a promise-based wrapper for GM_xmlhttpRequest
                const response = await new Promise((resolve, reject) => {
                    if (typeof GM_xmlhttpRequest !== 'undefined') {
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: amazonUrl,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                            },
                            onload: resolve,
                            onerror: reject,
                            ontimeout: () => reject(new Error('Request timeout')),
                            timeout: 10000
                        });
                    } else {
                        // Fallback to fetch if GM_xmlhttpRequest is not available
                        fetch(amazonUrl)
                            .then(response => resolve({ responseText: response.text() }))
                            .catch(reject);
                    }
                });
                
                if (response.status && response.status !== 200) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                // Parse the HTML response
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, 'text/html');
                
                // Extract product name
                let productName = '';
                const nameSelectors = [
                    '#productTitle',
                    '.product-title',
                    'h1.a-size-large',
                    'h1[data-automation-id="product-title"]',
                    '.a-size-large.product-title-word-break'
                ];
                
                for (const selector of nameSelectors) {
                    const nameElement = doc.querySelector(selector);
                    if (nameElement && nameElement.textContent.trim()) {
                        productName = nameElement.textContent.trim();
                        break;
                    }
                }
                
                // Extract product image
                let productImage = '';
                const imageSelectors = [
                    '#landingImage',
                    '.a-dynamic-image',
                    '#imgBlkFront',
                    '.a-image-wrapper img'
                ];
                
                for (const selector of imageSelectors) {
                    const imageElement = doc.querySelector(selector);
                    if (imageElement && imageElement.src) {
                        productImage = imageElement.src;
                        break;
                    }
                }
                
                const productInfo = {
                    asin: asin,
                    name: productName || asin,
                    image: productImage || ''
                };
                
                window.log(`✅ Successfully fetched product info:`, productInfo);
                return productInfo;
                
            } catch (error) {
                window.log(`❌ Error fetching product info for ${asin}:`, error.message);
                // Return fallback data
                return {
                    asin: asin,
                    name: asin,
                    image: ''
                };
            }
        },
        
        // Create alternates display for table cell
        createAlternatesDisplay: function(alternatesWithInfo, productKey) {
            const alternatesHtml = alternatesWithInfo.map(product => {
                // Truncate product name to 50 characters for table display
                const truncatedName = product.name.length > 50 ? 
                    product.name.substring(0, 50) + '...' : 
                    product.name;
                
                return `
                    <div class="cqe-alternate-item" style="display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                        ${product.image ? 
                            `<img src="${product.image}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" alt="${product.name}">` :
                            `<div style="width: 32px; height: 32px; background: #f0f0f0; border-radius: 4px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">IMG</div>`
                        }
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.85rem; color: #232f3e; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${product.name}">
                                ${truncatedName}
                            </div>
                        </div>
                        <button class="cqe-alternate-remove" data-asin="${product.asin}" data-product-key="${productKey}" 
                                style="background: none; border: none; color: #666; font-size: 16px; cursor: pointer; padding: 2px 4px; border-radius: 2px; line-height: 1;"
                                title="Remove alternate">×</button>
                    </div>
                `;
            }).join('');
            
            const isAtLimit = alternatesWithInfo.length >= 3;
            
            return `
                <div class="cqe-alternates-display">
                    ${alternatesHtml}
                    ${isAtLimit ? 
                        `<div class="cqe-max-alternates-message" style="font-size: 0.85rem; color: #666; text-align: center; margin-top: 8px; padding: 6px 12px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e9ecef;">
                            Maximum allowed alternate ASINs selected
                        </div>` :
                        `<button class="b-button cqe-add-alternates-btn" data-product-key="${productKey}" 
                                style="font-size: 0.85rem; padding: 6px 12px; margin-top: 8px;">
                            Add Alternates
                        </button>`
                    }
                </div>
            `;
        },
        
        // Update table with alternates after submission
        updateTableWithAlternates: async function(productKey, asins) {
            try {
                window.log(`🔄 Updating table with alternates for product: ${productKey}`);
                
                // Find the table row for this product
                const tableRow = document.querySelector(`tr[data-key="${productKey}"]`) || 
                                 document.querySelector(`tr[data-asin="${productKey}"]`);
                
                if (!tableRow) {
                    window.log(`❌ Could not find table row for product: ${productKey}`);
                    return;
                }
                
                // Find the "Add Alternates" button cell
                const buttonCell = tableRow.querySelector('.cqe-add-alternates-btn')?.closest('td');
                if (!buttonCell) {
                    window.log(`❌ Could not find button cell for product: ${productKey}`);
                    return;
                }
                
                // Show loading state
                buttonCell.innerHTML = `
                    <div style="text-align: center; padding: 10px;">
                        <div style="display: inline-block; width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">Loading...</div>
                    </div>
                `;
                
                // Fetch product info for each ASIN
                const alternatesWithInfo = [];
                for (const asin of asins) {
                    try {
                        const productInfo = await this.fetchProductInfoFromASIN(asin);
                        alternatesWithInfo.push(productInfo);
                        
                        // Store in global cache
                        if (!window.PRODUCT_ALTERNATES_STORAGE[productKey]) {
                            window.PRODUCT_ALTERNATES_STORAGE[productKey] = { productInfo: {} };
                        }
                        if (!window.PRODUCT_ALTERNATES_STORAGE[productKey].productInfo) {
                            window.PRODUCT_ALTERNATES_STORAGE[productKey].productInfo = {};
                        }
                        window.PRODUCT_ALTERNATES_STORAGE[productKey].productInfo[asin] = productInfo;
                    } catch (error) {
                        window.log(`⚠️ Failed to fetch info for ${asin}, using fallback`);
                        // Fallback to ASIN-only display
                        alternatesWithInfo.push({ asin, name: asin, image: null });
                    }
                }
                
                // Replace button with alternates display
                buttonCell.innerHTML = this.createAlternatesDisplay(alternatesWithInfo, productKey);
                
                // Add event listeners for remove buttons
                buttonCell.querySelectorAll('.cqe-alternate-remove').forEach(removeBtn => {
                    removeBtn.addEventListener('click', (e) => this.handleRemoveAlternateFromTable(e));
                });
                
                // Add event listener for the new "Add Alternates" button
                const newAddBtn = buttonCell.querySelector('.cqe-add-alternates-btn');
                if (newAddBtn && !newAddBtn.disabled) {
                    newAddBtn.addEventListener('click', (e) => this.handleAddAlternatesFromTable(e));
                }
                
                window.log(`✅ Successfully updated table with ${alternatesWithInfo.length} alternates`);
                
            } catch (error) {
                window.log(`❌ Error updating table with alternates:`, error);
            }
        },
        
        // Handle remove alternate from table
        handleRemoveAlternateFromTable: function(event) {
            const removeBtn = event.target;
            const asin = removeBtn.getAttribute('data-asin');
            const productKey = removeBtn.getAttribute('data-product-key');
            
            window.log(`🗑️ Removing alternate ${asin} from table for product ${productKey}`);
            
            // Remove from storage
            if (window.PRODUCT_ALTERNATES_STORAGE[productKey]) {
                if (window.PRODUCT_ALTERNATES_STORAGE[productKey].manualAsins) {
                    window.PRODUCT_ALTERNATES_STORAGE[productKey].manualAsins.delete(asin);
                }
                if (window.PRODUCT_ALTERNATES_STORAGE[productKey].selectedAlternates) {
                    window.PRODUCT_ALTERNATES_STORAGE[productKey].selectedAlternates.delete(asin);
                }
                if (window.PRODUCT_ALTERNATES_STORAGE[productKey].productInfo) {
                    delete window.PRODUCT_ALTERNATES_STORAGE[productKey].productInfo[asin];
                }
            }
            
            // Remove the item from display
            const alternateItem = removeBtn.closest('.cqe-alternate-item');
            if (alternateItem) {
                alternateItem.remove();
            }
            
            // Enhanced DOM traversal to find the button cell more reliably
            let buttonCell = null;
            
            // Try multiple approaches to find the containing cell
            // Approach 1: Direct closest td
            buttonCell = removeBtn.closest('td');
            
            // Approach 2: Look for alternates display container, then find its parent cell
            if (!buttonCell) {
                const alternatesDisplay = removeBtn.closest('.cqe-alternates-display');
                if (alternatesDisplay) {
                    buttonCell = alternatesDisplay.closest('td');
                }
            }
            
            // Approach 3: Traverse up the DOM tree looking for a table cell
            if (!buttonCell) {
                let element = removeBtn.parentElement;
                while (element && element !== document.body) {
                    if (element.tagName === 'TD') {
                        buttonCell = element;
                        break;
                    }
                    element = element.parentElement;
                }
            }
            
            // Approach 4: Find by looking for elements with the product key
            if (!buttonCell) {
                const elementsWithProductKey = document.querySelectorAll(`[data-product-key="${productKey}"]`);
                for (const element of elementsWithProductKey) {
                    const cell = element.closest('td');
                    if (cell && cell.querySelector('.cqe-alternates-display')) {
                        buttonCell = cell;
                        break;
                    }
                }
            }
            
            if (!buttonCell) {
                window.log('❌ Could not find button cell for removal operation after trying multiple approaches');
                window.log('DOM context:', {
                    removeBtn: removeBtn,
                    parentElement: removeBtn.parentElement,
                    productKey: productKey,
                    asin: asin
                });
                return;
            }
            
            window.log('✅ Found button cell using DOM traversal');
            
            const remainingAlternates = buttonCell.querySelectorAll('.cqe-alternate-item').length;
            const addBtn = buttonCell.querySelector('.cqe-add-alternates-btn');
            const maxMessage = buttonCell.querySelector('.cqe-max-alternates-message');
            
            window.log(`Remaining alternates: ${remainingAlternates}, Has add button: ${!!addBtn}, Has max message: ${!!maxMessage}`);
            
            // If we were at limit (3) and now below, replace message with button
            if (remainingAlternates < 3 && maxMessage && !addBtn) {
                window.log('Replacing max message with add button');
                maxMessage.outerHTML = `
                    <button class="b-button cqe-add-alternates-btn" data-product-key="${productKey}" 
                            style="font-size: 0.85rem; padding: 6px 12px; margin-top: 8px;">
                        Add Alternates
                    </button>
                `;
                
                // Add click handler to the new button
                const newAddBtn = buttonCell.querySelector('.cqe-add-alternates-btn');
                if (newAddBtn) {
                    newAddBtn.addEventListener('click', (e) => this.handleAddAlternatesFromTable(e));
                    window.log('✅ Added click handler to new Add Alternates button');
                } else {
                    window.log('❌ Failed to find newly created Add Alternates button');
                }
            }
            
            // If no alternates left, replace with original button
            if (remainingAlternates === 0) {
                window.log('No alternates remaining, replacing with original button');
                const originalProductData = this.getProductDataFromRow(buttonCell.closest('tr'));
                if (originalProductData && window.CQE_MAIN) {
                    buttonCell.innerHTML = `
                        <button class="b-button cqe-add-alternates-btn" type="button" style="margin: 0.25rem; padding: 6px 12px; font-size: 0.85rem;">
                            Add Alternates
                        </button>
                    `;
                    const newBtn = buttonCell.querySelector('.cqe-add-alternates-btn');
                    if (newBtn) {
                        newBtn.addEventListener('click', (e) => window.CQE_MAIN.handleAddAlternatesClick(e, originalProductData));
                        window.log('✅ Replaced with original Add Alternates button and added click handler');
                    }
                } else {
                    window.log('❌ Could not get original product data or CQE_MAIN not available');
                }
            }
        },
        
        // Handle add alternates from table (when alternates already exist)
        handleAddAlternatesFromTable: function(event) {
            const addBtn = event.target;
            const productKey = addBtn.getAttribute('data-product-key');
            
            window.log(`➕ Opening modal to add more alternates for product: ${productKey}`);
            
            // Get product data from the table row
            const tableRow = addBtn.closest('tr');
            const productData = this.getProductDataFromRow(tableRow);
            
            if (productData && window.CQE_MAIN) {
                // Add the product key for persistence
                productData.rowKey = productKey;
                window.CQE_MAIN.handleAddAlternatesClick(event, productData);
            }
        },
        
        // Helper function to get product data from table row
        getProductDataFromRow: function(row) {
            if (window.CQE_MAIN && window.CQE_MAIN.extractProductData) {
                return window.CQE_MAIN.extractProductData(row);
            }
            return null;
        },
        
        // Initialize modal functionality
        initializeModalFunctionality: function() {
            // Don't reset global state if it already exists (preserve data during re-initialization)
            if (!this.manualAsins) this.manualAsins = new Set();
            if (!this.selectedAlternates) this.selectedAlternates = new Set();
            
            // Add product info cache and tracking for incremental updates
            if (!this.productInfoCache) this.productInfoCache = new Map();
            if (!this.displayedAsins) this.displayedAsins = new Set();
            
            // Constants
            const ASIN_REGEX = window.ASIN_CONFIG ? window.ASIN_CONFIG.UI_REGEX : /^[A-Z0-9]{10}$/i;
            const MAX_ALTERNATES = window.UI_CONSTANTS ? window.UI_CONSTANTS.MAX_ALTERNATES : 3;
            
            // DOM elements
            const asinInput = document.getElementById('cqe-asin-input');
            const asinList = document.getElementById('cqe-asin-list');
            const selectedAlternatesDisplay = document.getElementById('cqe-selected-alternates-display');
            const asinError = document.getElementById('cqe-asin-error');
            const asinCounter = document.getElementById('cqe-asin-counter');
            const addAsinBtn = document.getElementById('cqe-add-asin-btn');
            const limitWarning = document.getElementById('cqe-limit-warning');
            
            // Validate data structures
            const validateDataStructures = () => {
                if (!(this.manualAsins instanceof Set)) {
                    console.warn('[CQE Alternates] Reinitializing manualAsins Set');
                    this.manualAsins = new Set();
                }
                if (!(this.selectedAlternates instanceof Set)) {
                    console.warn('[CQE Alternates] Reinitializing selectedAlternates Set');
                    this.selectedAlternates = new Set();
                }
            };
            
            // Call validation
            validateDataStructures();
            
            // Event delegation for remove buttons
            if (asinList) {
                // Remove existing listener to prevent duplicates
                if (this.handleRemoveClick) {
                    asinList.removeEventListener('click', this.handleRemoveClick);
                }
                
                this.handleRemoveClick = (event) => {
                    if (event.target.classList.contains('remove-btn')) {
                        const li = event.target.closest('li');
                        if (!li) return;
                        
                        const asinText = li.querySelector('.asin-text')?.textContent;
                        if (!asinText) return;
                        
                        const isManual = li.classList.contains('manual-entry');
                        
                        console.log(`[CQE Alternates] 🗑️ Removing ${isManual ? 'manual' : 'selected'} ASIN:`, asinText);
                        
                        // Update data structures
                        if (isManual) {
                            this.manualAsins.delete(asinText);
                        } else {
                            this.selectedAlternates.delete(asinText);
                            // Update alternate tiles to remove selection
                            document.querySelectorAll(`.alternate-tile[data-asin="${asinText}"]`)
                                .forEach(tile => tile.classList.remove('selected'));
                        }
                        
                        // Remove from DOM
                        li.remove();
                        
                        // Update counter and UI state
                        updateCounterAndUI();
                        
                        console.log('[CQE Alternates] ✅ ASIN removed successfully');
                    }
                };
                
                asinList.addEventListener('click', this.handleRemoveClick);
            }
            
            // Mock product data for demonstration
            const mockProducts = [
                {
                    asin: 'B09GHZWDCS',
                    name: 'Avery Big Tab Insertable Dividers for 3 Ring Binders, 5-Tab Sets, Buff Paper, Clear Tabs, 6 Binder Divider Sets (26177)',
                    description: 'Insertable dividers with clear tabs for easy organization',
                    image: 'https://m.media-amazon.com/images/I/71Uq+SoJnsL._AC_SX679_.jpg'
                },
                {
                    asin: 'B08TB5W8XP',
                    name: 'Avery Big Tab Extra-Wide Insertable Clear Tab Dividers for 3 Ring Binders, 8-Tab Set, White, 6 Sets (11254)',
                    description: 'Extra-wide clear tab dividers for enhanced visibility',
                    image: 'https://m.media-amazon.com/images/I/71Y18aTe4DL._AC_SX679_.jpg'
                },
                {
                    asin: 'B0CQ4YNHX8',
                    name: 'Binder Dividers for 3 Ring Binder, 1/5 Cut Tabs, Letter Size, Blank Write On Page Dividers with 5 Big Tabs for School Office Home, 4 Sets, 20 Dividers, White',
                    description: 'Blank write-on dividers with big tabs for customization',
                    image: 'https://m.media-amazon.com/images/I/51ccYH2KlGL._AC_SX679_.jpg'
                },
                {
                    asin: 'B097J3MSF9',
                    name: 'Avery 8 Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set Pack, 8 Packs, 8 Sets Total (11112)',
                    description: 'Clear big tabs with insertable labels for professional organization',
                    image: 'https://m.media-amazon.com/images/I/81MuNRHMKWS._AC_SX679_.jpg'
                }
            ];

            // Enhanced PII redaction patterns
            const stripPII = (text) => {
                if (!text) return text;
                
                return text
                    // Email addresses
                    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED EMAIL]')
                    // Phone numbers (various formats)
                    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]')
                    .replace(/\b\(\d{3}\)\s?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]')
                    .replace(/\b\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]')
                    // Social Security Numbers
                    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED SSN]')
                    // Credit card numbers (basic pattern)
                    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED CARD]');
            };

            // Get total count of alternates
            const getTotalAlternatesCount = () => {
                return this.manualAsins.size + this.selectedAlternates.size;
            };

            // Update the counter display and UI state
            const updateCounterAndUI = () => {
                if (!asinCounter) return;
                
                const totalCount = getTotalAlternatesCount();
                const isAtLimit = totalCount >= MAX_ALTERNATES;
                
                // Update counter text
                asinCounter.textContent = `(${totalCount}/${MAX_ALTERNATES})`;
                
                // Update counter styling
                if (isAtLimit) {
                    asinCounter.classList.add('at-limit');
                } else {
                    asinCounter.classList.remove('at-limit');
                }
                
                // Update input and button state
                if (asinInput) asinInput.disabled = isAtLimit;
                if (addAsinBtn) addAsinBtn.disabled = isAtLimit;
                
                // Show/hide limit warning
                if (limitWarning) {
                    if (isAtLimit) {
                        limitWarning.style.display = 'block';
                    } else {
                        limitWarning.style.display = 'none';
                    }
                }
                
                // Update alternate tiles if they exist
                const tiles = document.querySelectorAll('.alternate-tile:not(.selected)');
                tiles.forEach(tile => {
                    if (isAtLimit) {
                        tile.style.opacity = '0.5';
                        tile.style.cursor = 'not-allowed';
                    } else {
                        tile.style.opacity = '1';
                        tile.style.cursor = 'pointer';
                    }
                });
            };

            // Show error message with proper styling (red dotted outline) - for ASIN input only
            const showError = (message) => {
                if (!asinError || !asinInput) return;
                
                // Add error styling to input field with red dotted border
                asinInput.classList.add('is-error');
                asinInput.setAttribute('aria-invalid', 'true');
                asinInput.setAttribute('aria-describedby', 'cqe-asin-error');
                asinInput.style.border = '2px dotted #dc3545';
                asinInput.style.backgroundColor = '#fff5f5';
                
                // Show error message below input
                asinError.textContent = message;
                asinError.style.display = 'block';
                asinError.setAttribute('role', 'alert');
                asinError.classList.add('is-error');
                
                // Clear error after 5 seconds
                setTimeout(() => {
                    clearError();
                }, 5000);
            };
            
            // Clear error styling - for ASIN input only
            const clearError = () => {
                if (asinInput) {
                    asinInput.classList.remove('is-error');
                    asinInput.removeAttribute('aria-invalid');
                    asinInput.removeAttribute('aria-describedby');
                    asinInput.style.border = '';
                    asinInput.style.backgroundColor = '';
                }
                if (asinError) {
                    asinError.style.display = 'none';
                    asinError.classList.remove('is-error');
                    asinError.textContent = '';
                }
            };

            // Show form validation error - for form fields validation
            const showFormError = (message, fieldsToHighlight = []) => {
                const formError = document.getElementById('cqe-form-error');
                if (!formError) return;
                
                // Show error message above action buttons
                formError.textContent = message;
                formError.style.display = 'block';
                formError.setAttribute('role', 'alert');
                
                // Highlight specified form fields with red dotted border
                fieldsToHighlight.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.classList.add('is-error');
                        field.setAttribute('aria-invalid', 'true');
                    }
                });
                
                // Clear form error after 8 seconds
                setTimeout(() => {
                    clearFormError();
                }, 8000);
            };
            
            // Clear form validation error
            const clearFormError = () => {
                const formError = document.getElementById('cqe-form-error');
                if (formError) {
                    formError.style.display = 'none';
                    formError.textContent = '';
                }
                
                // Clear error styling from all form fields
                const formFields = ['cqe-intent', 'cqe-item-description', 'cqe-must-have', 'cqe-preferred'];
                formFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.classList.remove('is-error');
                        field.removeAttribute('aria-invalid');
                    }
                });
            };

            // Add manual ASIN to the list
            const addASIN = () => {
                if (!asinInput) return;
                
                const value = asinInput.value.trim().toUpperCase();
                
                // Clear any existing errors first
                clearError();
                
                // Validate ASIN format first
                if (!value) {
                    showError('ASIN required');
                    return false;
                }
                
                if (!ASIN_REGEX.test(value)) {
                    showError('Invalid ASIN format. Must be exactly 10 alphanumeric characters.');
                    return false;
                }
                
                // Check limit BEFORE other validations to avoid showing limit warning for invalid ASINs
                if (getTotalAlternatesCount() >= MAX_ALTERNATES) {
                    showError(`Maximum of ${MAX_ALTERNATES} total alternates allowed. Remove some items to add more.`);
                    return false;
                }
                
                // Check for duplicates in both manual and selected alternates
                if (this.manualAsins.has(value) || this.selectedAlternates.has(value)) {
                    showError('ASIN already exists in the list. Duplicates are not allowed.');
                    return false;
                }
                
                // Check if this is the original requested ASIN
                if (this.originalAsin && value === this.originalAsin) {
                    showError('Cannot add the original requested ASIN as an alternate. Please choose a different product.');
                    return false;
                }
                
                // If we get here, the ASIN is valid and can be added successfully
                // No error should be shown for valid ASINs
                this.manualAsins.add(value);
                asinInput.value = '';
                
                // Update consolidated display and counter
                updateSelectedAlternatesDisplay();
                updateCounterAndUI();
                
                return true;
            };

            // Helper function to create ASIN tile HTML
            const createAsinTileHTML = (asin, productInfo, isManual = true) => {
                const truncatedName = productInfo.name.length > 50 ? 
                    productInfo.name.substring(0, 50) + '...' : 
                    productInfo.name;
                
                const badgeClass = isManual ? 'background-color: #fff3cd; color: #856404;' : 'background-color: #d4edda; color: #155724;';
                const badgeText = isManual ? 'Customer Supplied' : 'Amazon Suggested';
                
                return `
                    ${productInfo.image ? 
                        `<img src="${productInfo.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" alt="${productInfo.name}">` :
                        `<div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">IMG</div>`
                    }
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="asin-text" style="font-family: monospace; font-weight: 600; color: #232f3e; font-size: 0.9rem;">${asin}</span>
                            <span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; ${badgeClass}">${badgeText}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${productInfo.name}">${truncatedName}</div>
                    </div>
                    <button class="remove-btn" title="Remove" style="background-color: #dc3545; color: white; padding: 4px 8px; font-size: 1rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">×</button>
                `;
            };

            // Helper function to create loading tile HTML
            const createLoadingTileHTML = (asin, isManual = true) => {
                const badgeClass = isManual ? 'background-color: #fff3cd; color: #856404;' : 'background-color: #d4edda; color: #155724;';
                const badgeText = isManual ? 'Customer Supplied' : 'Amazon Suggested';
                
                return `
                    <div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
                        <div style="width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="asin-text" style="font-family: monospace; font-weight: 600; color: #232f3e; font-size: 0.9rem;">${asin}</span>
                            <span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; ${badgeClass}">${badgeText}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #666;">Loading product info...</div>
                    </div>
                    <button class="remove-btn" title="Remove" style="background-color: #dc3545; color: white; padding: 4px 8px; font-size: 1rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">×</button>
                `;
            };

            // Update the consolidated alternates display with intelligent caching and incremental updates
            const updateSelectedAlternatesDisplay = async () => {
                if (!selectedAlternatesDisplay || !asinList) return;
                
                // Always show the section since we have the input field there
                selectedAlternatesDisplay.style.display = 'block';
                
                // Get current ASINs that should be displayed
                const currentAsins = new Set([...this.manualAsins, ...this.selectedAlternates]);
                
                // Find ASINs to add (new ones not currently displayed)
                const asinsToAdd = new Set([...currentAsins].filter(asin => !this.displayedAsins.has(asin)));
                
                // Find ASINs to remove (currently displayed but no longer needed)
                const asinsToRemove = new Set([...this.displayedAsins].filter(asin => !currentAsins.has(asin)));
                
                window.log(`🔄 Incremental update: Adding ${asinsToAdd.size}, Removing ${asinsToRemove.size}, Cached ${this.productInfoCache.size}`);
                
                // Remove ASINs that are no longer needed
                asinsToRemove.forEach(asin => {
                    const existingTile = asinList.querySelector(`li .asin-text[textContent="${asin}"]`)?.closest('li');
                    if (existingTile) {
                        existingTile.remove();
                        window.log(`🗑️ Removed tile for ${asin}`);
                    }
                    this.displayedAsins.delete(asin);
                });
                
                // Add new ASINs
                for (const asin of asinsToAdd) {
                    const isManual = this.manualAsins.has(asin);
                    const li = document.createElement('li');
                    li.className = isManual ? 'manual-entry' : 'selected-alternate';
                    li.style.cssText = `display: flex; align-items: center; gap: 12px; padding: 12px; background-color: ${isManual ? '#f8f9fa' : '#f8fff9'}; border-radius: 6px; border: 1px solid #e9ecef; border-left: 4px solid ${isManual ? '#ff9900' : '#28a745'}; margin-bottom: 8px;`;
                    
                    // Check if we have cached product info
                    if (this.productInfoCache.has(asin)) {
                        // Use cached data immediately - no loading state needed
                        const cachedInfo = this.productInfoCache.get(asin);
                        li.innerHTML = createAsinTileHTML(asin, cachedInfo, isManual);
                        window.log(`⚡ Used cached data for ${asin}`);
                    } else {
                        // Show loading state for new ASINs only
                        li.innerHTML = createLoadingTileHTML(asin, isManual);
                        window.log(`🔄 Loading new ASIN ${asin}`);
                        
                        // Fetch product info asynchronously for both manual ASINs and selected alternates
                        this.fetchProductInfoFromASIN(asin).then(productInfo => {
                            // Cache the result
                            this.productInfoCache.set(asin, productInfo);
                            
                            // Update the tile with fetched info
                            li.innerHTML = createAsinTileHTML(asin, productInfo, isManual);
                            window.log(`✅ Updated tile for ${asin} with fetched data (${isManual ? 'manual' : 'selected alternate'})`);
                        }).catch(error => {
                            // For selected alternates, try to use mock data as fallback before giving up
                            if (!isManual) {
                                const product = mockProducts.find(p => p.asin === asin);
                                if (product) {
                                    // Cache the mock data as fallback
                                    this.productInfoCache.set(asin, product);
                                    
                                    // Update with mock data
                                    li.innerHTML = createAsinTileHTML(asin, product, isManual);
                                    window.log(`📦 Used mock data fallback for ${asin} after fetch failed`);
                                    return;
                                }
                            }
                            
                            // Cache error state as final fallback
                            const errorInfo = { asin, name: asin, image: '' };
                            this.productInfoCache.set(asin, errorInfo);
                            
                            // Update with error state
                            li.innerHTML = createAsinTileHTML(asin, errorInfo, isManual);
                            window.log(`❌ Updated tile for ${asin} with error state (${isManual ? 'manual' : 'selected alternate'})`);
                        });
                    }
                    
                    // Insert in correct position (manual ASINs first, then selected alternates)
                    if (isManual) {
                        // Find the last manual entry or insert at beginning
                        const lastManualEntry = asinList.querySelector('li.manual-entry:last-of-type');
                        if (lastManualEntry) {
                            lastManualEntry.insertAdjacentElement('afterend', li);
                        } else {
                            asinList.insertAdjacentElement('afterbegin', li);
                        }
                    } else {
                        // Append selected alternates at the end
                        asinList.appendChild(li);
                    }
                    
                    this.displayedAsins.add(asin);
                }
                
                window.log(`✅ Display updated: ${this.displayedAsins.size} ASINs displayed, ${this.productInfoCache.size} cached`);
            };

            // Generate and display suggested alternates using multi-function agent
            const suggestAlternates = async () => {
                const itemDescription = document.getElementById('cqe-item-description')?.value.trim() || '';
                const mustHave = document.getElementById('cqe-must-have')?.value.trim() || '';
                const preferred = document.getElementById('cqe-preferred')?.value.trim() || '';
                const intent = document.getElementById('cqe-intent')?.value.trim() || '';
                
                if (!itemDescription && !mustHave && !preferred && !intent) {
                    showError('Please provide at least some information in the form fields to generate suggestions.');
                    return;
                }
                
                // Show loading state - simplified message without AI references
                const container = document.getElementById('cqe-suggested-alternates');
                if (!container) return;
                
                container.style.display = 'block';
                container.innerHTML = `
                    <div class="cqe-section-header">Gathering Alternates...</div>
                    <div style="text-align: center; padding: 20px;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 10px; color: #666;">Finding relevant alternates...</p>
                    </div>
                `;
                
                // Prepare form data for the multi-function agent
                const formData = {
                    originalProduct: window.currentProductData?.name || '',
                    itemDescription: itemDescription,
                    mustHaveAttributes: mustHave,
                    preferredAttributes: preferred,
                    customerUsageIntent: intent
                };
                
                try {
                    // Call the multi-function agent to generate search term
                    if (window.generateSearchTermWithAgent) {
                        window.log('🤖 Calling multi-function agent for search term generation');
                        
                        const agentResult = await window.generateSearchTermWithAgent(formData);
                        
                        if (agentResult.success && agentResult.searchTerm) {
                            // Print search term to console for debugging
                            console.log('🔍 Generated search term:', agentResult.searchTerm);
                            window.log('✅ Agent generated search term successfully:', agentResult.searchTerm);
                            
                            // Keep the same simple loading message - no AI references or search term display
                            container.innerHTML = `
                                <div class="cqe-section-header">Gathering Alternates...</div>
                                <div style="text-align: center; padding: 20px;">
                                    <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                    <p style="margin-top: 10px; color: #666;">Finding relevant alternates...</p>
                                </div>
                            `;
                            
                            // Use the generated search term with Amazon Search Module
                            if (window.AMAZON_SEARCH_MODULE) {
                                // Use the AI-generated search term instead of the original fields
                                window.AMAZON_SEARCH_MODULE.performSearch(agentResult.searchTerm, '', '', '', formData.originalProduct)
                                    .then(results => {
                                        window.log('✅ Amazon search completed with AI-generated term');
                                        displaySearchResults(results, agentResult.searchTerm);
                                    })
                                    .catch(error => {
                                        window.log('❌ Amazon search failed, falling back to mock data:', error);
                                        displaySearchFallback(error.message, agentResult.searchTerm);
                                    });
                            } else {
                                // Fallback if search module not available
                                setTimeout(() => {
                                    displaySearchFallback('Search module not available', agentResult.searchTerm);
                                }, 1000);
                            }
                        } else {
                            // Agent failed, fall back to original search method
                            window.log('❌ Agent search term generation failed, falling back to original method');
                            fallbackToOriginalSearch(formData, container);
                        }
                    } else {
                        // Agent function not available, fall back to original search method
                        window.log('❌ Multi-function agent not available, falling back to original method');
                        fallbackToOriginalSearch(formData, container);
                    }
                } catch (error) {
                    window.log('❌ Error in agent search term generation:', error);
                    fallbackToOriginalSearch(formData, container);
                }
            };
            
            // Fallback to original search method
            const fallbackToOriginalSearch = (formData, container) => {
                container.innerHTML = `
                    <div class="cqe-section-header">Gathering Alternates...</div>
                    <div style="text-align: center; padding: 20px;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 10px; color: #666;">Finding relevant alternates...</p>
                    </div>
                `;
                
                if (window.AMAZON_SEARCH_MODULE) {
                    window.AMAZON_SEARCH_MODULE.performSearch(
                        formData.itemDescription, 
                        formData.mustHaveAttributes, 
                        formData.preferredAttributes, 
                        formData.customerUsageIntent, 
                        formData.originalProduct
                    )
                        .then(results => {
                            window.log('✅ Fallback search completed, displaying results');
                            displaySearchResults(results);
                        })
                        .catch(error => {
                            window.log('❌ Fallback search failed, using mock data:', error);
                            displaySearchFallback(error.message);
                        });
                } else {
                    setTimeout(() => {
                        displaySearchFallback('Search module not available');
                    }, 2000);
                }
            };
            
            // Display search results
            const displaySearchResults = (results) => {
                const container = document.getElementById('cqe-suggested-alternates');
                if (!container) return;
                
                // Store all results for replacement functionality
                window.allSearchResults = results;
                window.displayedResultIndices = new Set();
                
                container.innerHTML = `
                    <div class="cqe-section-header">
                        Select Suggested Alternates
                        <div class="b-mt-small b-popover floating b-right b-hover" data-testid="select-alternates-popover-container">
                            <button data-testid="select-alternates-popover-trigger" type="button" aria-expanded="false">
                                <div class="b-alert b-info b-inline" role="alert"></div>
                            </button>
                            <div class="b-content" tabindex="-1" style="position: absolute; visibility: hidden; max-width: 276px;">
                                <section class="b-body">
                                    Click on alternates below to select them for inclusion in your request (${getTotalAlternatesCount()}/${MAX_ALTERNATES} used).
                                </section>
                                <div class="floating-arrow"></div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Display first 4 results
                const resultsToShow = results.slice(0, 4);
                resultsToShow.forEach((product, index) => {
                    window.displayedResultIndices.add(index);
                    const tile = this.createProductTile(product, index);
                    container.appendChild(tile);
                });
                
                // Update UI state for tiles
                updateCounterAndUI();
            };
            
            // Display fallback when search fails
            const displaySearchFallback = (errorMessage) => {
                const container = document.getElementById('cqe-suggested-alternates');
                if (!container) return;
                
                window.log('🔄 Displaying fallback mock data due to search failure');
                
                container.innerHTML = `
                    <div class="cqe-section-header">Select Suggested Alternates</div>
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
                        <strong>⚠️ Search temporarily unavailable</strong><br>
                        <small>Showing sample alternates. Error: ${errorMessage}</small>
                    </div>
                    <p>Click on alternates below to select them for inclusion in your request (${getTotalAlternatesCount()}/${MAX_ALTERNATES} used):</p>
                `;
                
                // Use mock data as fallback
                const results = mockProducts.slice(0, 4);
                
                results.forEach(product => {
                    const tile = document.createElement('div');
                    tile.className = 'alternate-tile';
                    tile.dataset.asin = product.asin;
                    
                    // Check if already selected
                    if (this.selectedAlternates.has(product.asin)) {
                        tile.classList.add('selected');
                    }
                    
                    tile.onclick = () => toggleAlternateSelection(product.asin, tile);
                    
                    tile.innerHTML = `
                        <img src="${product.image}" alt="${product.name}" />
                        <div class="product-info">
                            <div class="product-name">${product.name}</div>
                            <div class="product-description">${product.description}</div>
                            <div class="product-asin">ASIN: ${product.asin}</div>
                        </div>
                    `;
                    
                    container.appendChild(tile);
                });
                
                // Update UI state for tiles
                updateCounterAndUI();
            };

            // Toggle alternate selection
            const toggleAlternateSelection = (asin, tile) => {
                // Check for duplicates across both lists
                if (this.manualAsins.has(asin)) {
                    showError('This ASIN is already in your manual entries. Cannot select as alternate.');
                    return;
                }
                
                // Check if this is the original requested ASIN
                if (this.originalAsin && asin === this.originalAsin) {
                    showError('Cannot select the original requested ASIN as an alternate. Please choose a different product.');
                    return;
                }
                
                if (tile.classList.contains('selected')) {
                    // Deselecting - always allowed
                    tile.classList.remove('selected');
                    this.selectedAlternates.delete(asin);
                } else {
                    // Selecting - check limit
                    if (getTotalAlternatesCount() >= MAX_ALTERNATES) {
                        showError(`Maximum of ${MAX_ALTERNATES} total alternates allowed. Remove some items to add more.`);
                        return;
                    }
                    
                    tile.classList.add('selected');
                    this.selectedAlternates.add(asin);
                }
                
                updateSelectedAlternatesDisplay();
                updateCounterAndUI();
            };

            // Generate supplier summary with retry logic (3 attempts)
            const generateSummaryWithRetry = async (formData, payload, productKey, maxRetries = 3) => {
                let lastError = null;
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        window.log(`🤖 Calling multi-function agent for supplier summary generation (attempt ${attempt}/${maxRetries})`);
                        
                        const summaryResult = await window.generateSupplierSummaryWithAgent(formData);
                        
                        if (summaryResult.success && summaryResult.summary) {
                            window.log(`✅ Supplier summary generated successfully on attempt ${attempt}`);
                            
                            // Print the summary received from the API to the console
                            console.log('API Summary:', summaryResult.summary);
                            console.log('Full API Response:', summaryResult);
                            
                            // Store submission data for later use
                            window.LAST_SUBMISSION_DATA = {
                                timestamp: new Date().toISOString(),
                                payload: payload,
                                summaryResult: summaryResult,
                                productKey: productKey,
                                attempts: attempt
                            };
                            
                            // Log detailed summary to console
                            console.log('='.repeat(60));
                            console.log('SUPPLIER SUMMARY GENERATED SUCCESSFULLY');
                            console.log('='.repeat(60));
                            console.log(`Attempts required: ${attempt}/${maxRetries}`);
                            console.log(`Manual ASINs (${payload.manualAsins.length}):`, payload.manualAsins);
                            console.log(`Selected Alternates (${payload.selectedAlternates.length}):`, payload.selectedAlternates);
                            console.log(`Total ASINs: ${payload.allAsins.length}/${MAX_ALTERNATES}`);
                            console.log('AI-Generated Supplier Summary:');
                            console.log('─'.repeat(50));
                            console.log(summaryResult.summary);
                            console.log('─'.repeat(50));
                            console.log('Next steps:');
                            console.log('- Summary has been generated for suppliers');
                            console.log('- Product search will find additional matches');
                            console.log('- Suppliers will receive the AI-optimized context');
                            console.log('='.repeat(60));
                            
                            return; // Success - exit retry loop
                        } else {
                            throw new Error('Summary generation failed: ' + (summaryResult.error || 'Unknown error'));
                        }
                    } catch (error) {
                        lastError = error;
                        window.log(`❌ Supplier summary generation failed on attempt ${attempt}:`, error.message);
                        
                        // If not the last attempt, wait before retrying (exponential backoff)
                        if (attempt < maxRetries) {
                            const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                            window.log(`⏳ Waiting ${delay}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
                
                // All retries failed
                window.log(`❌ Supplier summary generation failed after ${maxRetries} attempts:`, lastError?.message);
                
                // Store submission data with error
                window.LAST_SUBMISSION_DATA = {
                    timestamp: new Date().toISOString(),
                    payload: payload,
                    summaryResult: null,
                    productKey: productKey,
                    error: lastError?.message,
                    attempts: maxRetries,
                    failed: true
                };
                
                // Log final failure to console
                console.log('='.repeat(60));
                console.log('SUPPLIER SUMMARY GENERATION FAILED');
                console.log('='.repeat(60));
                console.log(`Failed after ${maxRetries} attempts`);
                console.log(`Final error: ${lastError?.message}`);
                console.log(`Manual ASINs (${payload.manualAsins.length}):`, payload.manualAsins);
                console.log(`Selected Alternates (${payload.selectedAlternates.length}):`, payload.selectedAlternates);
                console.log(`Total ASINs: ${payload.allAsins.length}/${MAX_ALTERNATES}`);
                console.log('Next steps:');
                console.log('- Form data will be processed manually');
                console.log('- Product search will find additional matches');
                console.log('- Suppliers will receive basic context');
                console.log('='.repeat(60));
            };

            // Submit the form with immediate modal closure and async summary generation
            const submitForm = async () => {
                // Prepare submission payload with clear separation
                const payload = {
                    manualAsins: Array.from(this.manualAsins),
                    selectedAlternates: Array.from(this.selectedAlternates),
                    allAsins: [...Array.from(this.manualAsins), ...Array.from(this.selectedAlternates)],
                    intent: stripPII(document.getElementById('cqe-intent')?.value.trim() || ''),
                    itemDescription: stripPII(document.getElementById('cqe-item-description')?.value.trim() || ''),
                    mustHave: stripPII(document.getElementById('cqe-must-have')?.value.trim() || ''),
                    preferred: stripPII(document.getElementById('cqe-preferred')?.value.trim() || '')
                };
                
                // Clear any existing form errors first
                clearFormError();
                
                // Validate payload
                if (payload.allAsins.length === 0) {
                    showFormError('Please add at least one ASIN (manual or selected alternate) before submitting.');
                    return;
                }
                
                if (!payload.intent && !payload.itemDescription && !payload.mustHave && !payload.preferred) {
                    // Determine which fields are empty and highlight them
                    const emptyFields = [];
                    if (!payload.intent) emptyFields.push('cqe-intent');
                    if (!payload.itemDescription) emptyFields.push('cqe-item-description');
                    if (!payload.mustHave) emptyFields.push('cqe-must-have');
                    if (!payload.preferred) emptyFields.push('cqe-preferred');
                    
                    showFormError('Please provide at least some information in the Alternates Information Form fields.', emptyFields);
                    return;
                }
                
                window.log('Submitting payload to downstream services:', payload);
                
                // IMMEDIATE ACTIONS (synchronous) - Store data and update table
                const productKey = window.currentProductData?.id || window.currentProductData?.asin || window.currentProductData?.rowKey;
                
                // Store alternates data immediately
                if (productKey && payload.allAsins.length > 0) {
                    window.PRODUCT_ALTERNATES_STORAGE[productKey] = {
                        manualAsins: new Set(payload.manualAsins),
                        selectedAlternates: new Set(payload.selectedAlternates),
                        productInfo: {}
                    };
                    
                    // Update the table display with alternates (synchronous)
                    try {
                        await this.updateTableWithAlternates(productKey, payload.allAsins);
                        window.log('✅ Table updated with alternates immediately');
                    } catch (error) {
                        window.log('⚠️ Table update failed, but continuing with submission:', error);
                    }
                }
                
                // Log immediate submission success
                console.log('='.repeat(60));
                console.log('FORM SUBMISSION SUCCESSFUL - MODAL CLOSING');
                console.log('='.repeat(60));
                console.log(`Manual ASINs (${payload.manualAsins.length}):`, payload.manualAsins);
                console.log(`Selected Alternates (${payload.selectedAlternates.length}):`, payload.selectedAlternates);
                console.log(`Total ASINs: ${payload.allAsins.length}/${MAX_ALTERNATES}`);
                console.log('Status: Data stored, table updated, summary generation starting in background...');
                console.log('='.repeat(60));
                
                // CLOSE MODAL IMMEDIATELY - Don't wait for summary generation
                if (window.MODAL_SYSTEM) {
                    window.MODAL_SYSTEM.closeModal();
                }
                
                // BACKGROUND ACTIONS (asynchronous) - Generate summary with retry logic
                // This runs independently after modal closure
                if (window.generateSupplierSummaryWithAgent) {
                    const formData = {
                        originalProduct: window.currentProductData?.name || '',
                        customerUsageIntent: payload.intent,
                        itemDescription: payload.itemDescription,
                        mustHaveAttributes: payload.mustHave,
                        preferredAttributes: payload.preferred
                    };
                    
                    // Start summary generation in background (no await - fire and forget)
                    generateSummaryWithRetry(formData, payload, productKey).catch(error => {
                        window.log('❌ Background summary generation encountered an error:', error);
                    });
                } else {
                    window.log('❌ Multi-function agent not available for supplier summary');
                    
                    // Store submission data without summary
                    window.LAST_SUBMISSION_DATA = {
                        timestamp: new Date().toISOString(),
                        payload: payload,
                        summaryResult: null,
                        productKey: productKey,
                        error: 'Agent not available'
                    };
                    
                    console.log('⚠️ Summary generation skipped - agent not available');
                }
            };

            // Character counting functions
            const updateCharacterCount = (textareaId, counterId, maxLength = 200) => {
                const textarea = document.getElementById(textareaId);
                const counter = document.getElementById(counterId);
                
                if (!textarea || !counter) return;
                
                const currentLength = textarea.value.length;
                counter.textContent = `${currentLength}/${maxLength}`;
                
                // Update styling based on character count
                counter.classList.remove('warning', 'error');
                if (currentLength > maxLength * 0.9) {
                    counter.classList.add('warning');
                }
                if (currentLength >= maxLength) {
                    counter.classList.add('error');
                }
            };
            
            const updateAllCharacterCounts = () => {
                updateCharacterCount('cqe-intent', 'cqe-intent-count');
                updateCharacterCount('cqe-item-description', 'cqe-item-description-count');
                updateCharacterCount('cqe-must-have', 'cqe-must-have-count');
                updateCharacterCount('cqe-preferred', 'cqe-preferred-count');
            };
            
            const setupCharacterCountListeners = () => {
                const fields = [
                    { textareaId: 'cqe-intent', counterId: 'cqe-intent-count' },
                    { textareaId: 'cqe-item-description', counterId: 'cqe-item-description-count' },
                    { textareaId: 'cqe-must-have', counterId: 'cqe-must-have-count' },
                    { textareaId: 'cqe-preferred', counterId: 'cqe-preferred-count' }
                ];
                
                fields.forEach(field => {
                    const textarea = document.getElementById(field.textareaId);
                    if (textarea) {
                        textarea.addEventListener('input', () => {
                            updateCharacterCount(field.textareaId, field.counterId);
                        });
                        textarea.addEventListener('paste', () => {
                            // Update count after paste event completes
                            setTimeout(() => {
                                updateCharacterCount(field.textareaId, field.counterId);
                            }, 10);
                        });
                    }
                });
            };

            // Event listeners
            if (addAsinBtn) {
                addAsinBtn.addEventListener('click', addASIN);
            }

            if (asinInput) {
                // Add Enter key support for ASIN input
                asinInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        addASIN();
                    }
                });

                // Auto-format ASIN input to uppercase and validate in real-time
                asinInput.addEventListener('input', function(e) {
                    e.target.value = e.target.value.toUpperCase();
                    
                    // Clear error styling if input becomes valid or is being typed
                    const value = e.target.value.trim();
                    if (value.length === 0) {
                        // Clear errors when input is empty
                        clearError();
                    } else if (ASIN_REGEX.test(value)) {
                        // Clear errors when ASIN format is valid
                        clearError();
                    } else if (value.length > 0 && value.length < 10) {
                        // Don't show error while user is still typing (less than 10 chars)
                        clearError();
                    } else if (value.length > 10) {
                        // Show error for too long input with red dotted outline
                        showError('ASIN must be exactly 10 characters.');
                    }
                });
                
                // Validate on blur (when user leaves the field)
                asinInput.addEventListener('blur', function(e) {
                    const value = e.target.value.trim();
                    if (value.length > 0 && !ASIN_REGEX.test(value)) {
                        showError('Invalid ASIN format. Must be exactly 10 alphanumeric characters.');
                    }
                });
            }

            // Suggest alternates button
            const suggestBtn = document.getElementById('cqe-suggest-btn');
            if (suggestBtn) {
                suggestBtn.addEventListener('click', suggestAlternates);
            }

            // Submit button
            const submitBtn = document.getElementById('cqe-submit-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', submitForm);
            }

            // Cancel button
            const cancelBtn = document.getElementById('cqe-cancel-alternates');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (window.MODAL_SYSTEM) {
                        window.MODAL_SYSTEM.closeModal();
                    }
                });
            }

            // Close button
            const closeBtn = document.querySelector('.cqe-modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (window.MODAL_SYSTEM) {
                        window.MODAL_SYSTEM.closeModal();
                    }
                });
            }

            // Initialize counter on page load
            updateCounterAndUI();
            
            // Update the display to show any existing alternates that were loaded
            updateSelectedAlternatesDisplay();
            
            // Setup character count listeners
            setupCharacterCountListeners();
            
            // Initialize character counts
            updateAllCharacterCounts();
            
            window.log('Modal functionality initialized successfully');
        },

        // Create product tile with view and decline buttons
        createProductTile: function(product, index) {
            const tile = document.createElement('div');
            tile.className = 'alternate-tile-enhanced';
            tile.dataset.asin = product.asin;
            tile.dataset.index = index;
            
            // Check if already selected
            if (this.selectedAlternates.has(product.asin)) {
                tile.classList.add('selected');
            }
            
            tile.innerHTML = `
                <img src="${product.image}" alt="${product.name}" />
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-description">${product.description}</div>
                    <div class="product-asin">ASIN: ${product.asin}</div>
                </div>
                <div class="product-actions">
                    <button class="view-btn" data-asin="${product.asin}" title="View product on Amazon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                        View
                    </button>
                    <button class="decline-btn" data-asin="${product.asin}" data-index="${index}" title="Decline this product">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                        Decline
                    </button>
                </div>
            `;
            
            // Add click handler for selection (clicking on the main area, not buttons)
            const productInfo = tile.querySelector('.product-info');
            productInfo.onclick = () => this.toggleAlternateSelection(product.asin, tile);
            
            // Add click handlers for buttons
            const viewBtn = tile.querySelector('.view-btn');
            const declineBtn = tile.querySelector('.decline-btn');
            
            viewBtn.onclick = (e) => {
                e.stopPropagation();
                this.handleViewProduct(product.asin);
            };
            
            declineBtn.onclick = (e) => {
                e.stopPropagation();
                this.handleDeclineProduct(product.asin, index);
            };
            
            return tile;
        },

        // Handle view product button click
        handleViewProduct: function(asin) {
            const amazonUrl = `https://www.amazon.com/dp/${asin}`;
            window.open(amazonUrl, '_blank');
            window.log(`🔗 Opened product page for ASIN: ${asin}`);
        },

        // Handle decline product button click
        handleDeclineProduct: function(asin, index) {
            window.log(`👎 Declining product: ${asin} at index ${index}`);
            this.showDeclineFeedbackModal(asin, index);
        },

        // Show decline feedback modal
        showDeclineFeedbackModal: function(asin, index) {
            // Create modal overlay
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'decline-feedback-overlay';
            modalOverlay.innerHTML = `
                <div class="decline-feedback-modal">
                    <div class="decline-feedback-header">
                        <h4>Why are you declining this product?</h4>
                        <button class="decline-feedback-close">&times;</button>
                    </div>
                    <div class="decline-feedback-body">
                        <p>Please select the reason(s) why this product doesn't meet your needs:</p>
                        <div class="decline-reasons">
                            <label class="decline-reason">
                                <input type="checkbox" value="not-relevant" />
                                <span>Not relevant to my needs</span>
                            </label>
                            <label class="decline-reason">
                                <input type="checkbox" value="price-range" />
                                <span>Not within my price range</span>
                            </label>
                            <label class="decline-reason">
                                <input type="checkbox" value="missing-attributes" />
                                <span>Doesn't have key attributes I need</span>
                            </label>
                            <label class="decline-reason">
                                <input type="checkbox" value="quality-concerns" />
                                <span>Quality or brand concerns</span>
                            </label>
                            <label class="decline-reason">
                                <input type="checkbox" value="availability" />
                                <span>Availability or shipping concerns</span>
                            </label>
                            <label class="decline-reason">
                                <input type="checkbox" value="other" />
                                <span>Other (please specify)</span>
                            </label>
                        </div>
                        <div class="other-reason-container" style="display: none;">
                            <textarea id="other-reason-text" placeholder="Please specify your reason..." maxlength="200"></textarea>
                            <div class="character-count">0/200</div>
                        </div>
                        <div class="decline-feedback-error" style="display: none;"></div>
                    </div>
                    <div class="decline-feedback-actions">
                        <button class="decline-feedback-submit">Submit Feedback</button>
                        <button class="decline-feedback-cancel">Cancel</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalOverlay);
            
            // Add event listeners
            const closeBtn = modalOverlay.querySelector('.decline-feedback-close');
            const cancelBtn = modalOverlay.querySelector('.decline-feedback-cancel');
            const submitBtn = modalOverlay.querySelector('.decline-feedback-submit');
            const otherCheckbox = modalOverlay.querySelector('input[value="other"]');
            const otherContainer = modalOverlay.querySelector('.other-reason-container');
            const otherTextarea = modalOverlay.querySelector('#other-reason-text');
            const characterCount = modalOverlay.querySelector('.character-count');
            
            // Close modal handlers
            const closeModal = () => {
                document.body.removeChild(modalOverlay);
            };
            
            closeBtn.onclick = closeModal;
            cancelBtn.onclick = closeModal;
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) closeModal();
            };
            
            // Show/hide other reason text area
            otherCheckbox.onchange = () => {
                if (otherCheckbox.checked) {
                    otherContainer.style.display = 'block';
                    otherTextarea.focus();
                } else {
                    otherContainer.style.display = 'none';
                    otherTextarea.value = '';
                    characterCount.textContent = '0/200';
                }
            };
            
            // Character count for other reason
            otherTextarea.oninput = () => {
                const length = otherTextarea.value.length;
                characterCount.textContent = `${length}/200`;
                if (length > 180) {
                    characterCount.style.color = '#ff9800';
                } else if (length >= 200) {
                    characterCount.style.color = '#f44336';
                } else {
                    characterCount.style.color = '#666';
                }
            };
            
            // Submit feedback
            submitBtn.onclick = () => {
                this.submitDeclineFeedback(asin, index, modalOverlay, closeModal);
            };
        },

        // Submit decline feedback
        submitDeclineFeedback: function(asin, index, modalOverlay, closeModal) {
            const checkboxes = modalOverlay.querySelectorAll('input[type="checkbox"]:checked');
            const otherText = modalOverlay.querySelector('#other-reason-text').value.trim();
            const errorDiv = modalOverlay.querySelector('.decline-feedback-error');
            
            // Validate at least one reason is selected
            if (checkboxes.length === 0) {
                errorDiv.textContent = 'Please select at least one reason for declining this product.';
                errorDiv.style.display = 'block';
                return;
            }
            
            // Validate other reason text if "other" is selected
            const otherSelected = Array.from(checkboxes).some(cb => cb.value === 'other');
            if (otherSelected && !otherText) {
                errorDiv.textContent = 'Please specify your reason in the text area.';
                errorDiv.style.display = 'block';
                return;
            }
            
            // Collect feedback data
            const reasons = Array.from(checkboxes).map(cb => cb.value);
            const feedback = {
                asin: asin,
                reasons: reasons,
                otherReason: otherSelected ? otherText : null,
                timestamp: new Date().toISOString()
            };
            
            // Log feedback to console
            console.log('Product Decline Feedback:', feedback);
            window.log('👎 Product declined with feedback:', feedback);
            
            // Remove the product from display and replace with next available
            this.replaceDeclinedProduct(asin, index);
            
            // Close modal
            closeModal();
        },

        // Replace declined product with next available from search results
        replaceDeclinedProduct: function(asin, index) {
            // Find the tile to remove
            const tileToRemove = document.querySelector(`.alternate-tile-enhanced[data-asin="${asin}"]`);
            if (!tileToRemove) {
                window.log('❌ Could not find tile to remove for ASIN:', asin);
                return;
            }
            
            // Remove from selected alternates if it was selected
            if (this.selectedAlternates.has(asin)) {
                this.selectedAlternates.delete(asin);
                this.updateSelectedAlternatesDisplay();
            }
            
            // Find next available product from all search results
            const allResults = window.allSearchResults || [];
            const displayedIndices = window.displayedResultIndices || new Set();
            
            // Find next unused result
            let nextProduct = null;
            let nextIndex = -1;
            
            for (let i = 0; i < allResults.length; i++) {
                if (!displayedIndices.has(i)) {
                    nextProduct = allResults[i];
                    nextIndex = i;
                    break;
                }
            }
            
            if (nextProduct) {
                // Replace with next product
                window.displayedResultIndices.delete(index);
                window.displayedResultIndices.add(nextIndex);
                
                const newTile = this.createProductTile(nextProduct, nextIndex);
                tileToRemove.parentNode.replaceChild(newTile, tileToRemove);
                
                window.log(`✅ Replaced declined product ${asin} with ${nextProduct.asin}`);
            } else {
                // No more products available, just remove the tile
                tileToRemove.remove();
                window.displayedResultIndices.delete(index);
                window.log(`🔚 No more products available, removed tile for ${asin}`);
            }
            
            // Update UI state
            this.updateCounterAndUI();
        },

        // Toggle alternate selection (updated to work with new tile structure)
        toggleAlternateSelection: function(asin, tile) {
            // Check for duplicates across both lists
            if (this.manualAsins.has(asin)) {
                this.showError('This ASIN is already in your manual entries. Cannot select as alternate.');
                return;
            }
            
            // Check if this is the original requested ASIN
            if (this.originalAsin && asin === this.originalAsin) {
                this.showError('Cannot select the original requested ASIN as an alternate. Please choose a different product.');
                return;
            }
            
            if (tile.classList.contains('selected')) {
                // Deselecting - always allowed
                tile.classList.remove('selected');
                this.selectedAlternates.delete(asin);
            } else {
                // Selecting - check limit
                const MAX_ALTERNATES = window.UI_CONSTANTS ? window.UI_CONSTANTS.MAX_ALTERNATES : 3;
                const totalCount = this.manualAsins.size + this.selectedAlternates.size;
                
                if (totalCount >= MAX_ALTERNATES) {
                    this.showError(`Maximum of ${MAX_ALTERNATES} total alternates allowed. Remove some items to add more.`);
                    return;
                }
                
                tile.classList.add('selected');
                this.selectedAlternates.add(asin);
            }
            
            this.updateSelectedAlternatesDisplay();
            this.updateCounterAndUI();
        },

        // Helper method to show error (reference to existing function)
        showError: function(message) {
            const asinError = document.getElementById('cqe-asin-error');
            const asinInput = document.getElementById('cqe-asin-input');
            
            if (!asinError || !asinInput) return;
            
            // Add error styling to input field with red dotted border
            asinInput.classList.add('is-error');
            asinInput.setAttribute('aria-invalid', 'true');
            asinInput.setAttribute('aria-describedby', 'cqe-asin-error');
            asinInput.style.border = '2px dotted #dc3545';
            asinInput.style.backgroundColor = '#fff5f5';
            
            // Show error message below input
            asinError.textContent = message;
            asinError.style.display = 'block';
            asinError.setAttribute('role', 'alert');
            asinError.classList.add('is-error');
            
            // Clear error after 5 seconds
            setTimeout(() => {
                if (asinInput) {
                    asinInput.classList.remove('is-error');
                    asinInput.removeAttribute('aria-invalid');
                    asinInput.removeAttribute('aria-describedby');
                    asinInput.style.border = '';
                    asinInput.style.backgroundColor = '';
                }
                if (asinError) {
                    asinError.style.display = 'none';
                    asinError.classList.remove('is-error');
                    asinError.textContent = '';
                }
            }, 5000);
        },

        // Helper methods for counter and display updates (references to existing functions)
        updateCounterAndUI: function() {
            // Find and call the actual updateCounterAndUI function from initializeModalFunctionality
            const asinCounter = document.getElementById('cqe-asin-counter');
            const asinInput = document.getElementById('cqe-asin-input');
            const addAsinBtn = document.getElementById('cqe-add-asin-btn');
            const limitWarning = document.getElementById('cqe-limit-warning');
            
            if (!asinCounter) return;
            
            const MAX_ALTERNATES = window.UI_CONSTANTS ? window.UI_CONSTANTS.MAX_ALTERNATES : 3;
            const totalCount = this.manualAsins.size + this.selectedAlternates.size;
            const isAtLimit = totalCount >= MAX_ALTERNATES;
            
            // Update counter text
            asinCounter.textContent = `(${totalCount}/${MAX_ALTERNATES})`;
            
            // Update counter styling
            if (isAtLimit) {
                asinCounter.classList.add('at-limit');
            } else {
                asinCounter.classList.remove('at-limit');
            }
            
            // Update input and button state
            if (asinInput) asinInput.disabled = isAtLimit;
            if (addAsinBtn) addAsinBtn.disabled = isAtLimit;
            
            // Show/hide limit warning
            if (limitWarning) {
                if (isAtLimit) {
                    limitWarning.style.display = 'block';
                } else {
                    limitWarning.style.display = 'none';
                }
            }
            
            // Update alternate tiles if they exist
            const tiles = document.querySelectorAll('.alternate-tile:not(.selected)');
            tiles.forEach(tile => {
                if (isAtLimit) {
                    tile.style.opacity = '0.5';
                    tile.style.cursor = 'not-allowed';
                } else {
                    tile.style.opacity = '1';
                    tile.style.cursor = 'pointer';
                }
            });
        },

        updateSelectedAlternatesDisplay: async function() {
            // Find and call the actual updateSelectedAlternatesDisplay function from initializeModalFunctionality
            const selectedAlternatesDisplay = document.getElementById('cqe-selected-alternates-display');
            const asinList = document.getElementById('cqe-asin-list');
            
            if (!selectedAlternatesDisplay || !asinList) return;
            
            // Always show the section since we have the input field there
            selectedAlternatesDisplay.style.display = 'block';
            
            // Get current ASINs that should be displayed
            const currentAsins = new Set([...this.manualAsins, ...this.selectedAlternates]);
            
            // Find ASINs to add (new ones not currently displayed)
            const asinsToAdd = new Set([...currentAsins].filter(asin => !this.displayedAsins.has(asin)));
            
            // Find ASINs to remove (currently displayed but no longer needed)
            const asinsToRemove = new Set([...this.displayedAsins].filter(asin => !currentAsins.has(asin)));
            
            window.log(`🔄 Incremental update: Adding ${asinsToAdd.size}, Removing ${asinsToRemove.size}, Cached ${this.productInfoCache.size}`);
            
            // Remove ASINs that are no longer needed
            asinsToRemove.forEach(asin => {
                const existingTile = asinList.querySelector(`li .asin-text[textContent="${asin}"]`)?.closest('li');
                if (existingTile) {
                    existingTile.remove();
                    window.log(`🗑️ Removed tile for ${asin}`);
                }
                this.displayedAsins.delete(asin);
            });
            
            // Helper function to create ASIN tile HTML
            const createAsinTileHTML = (asin, productInfo, isManual = true) => {
                const truncatedName = productInfo.name.length > 50 ? 
                    productInfo.name.substring(0, 50) + '...' : 
                    productInfo.name;
                
                const badgeClass = isManual ? 'background-color: #fff3cd; color: #856404;' : 'background-color: #d4edda; color: #155724;';
                const badgeText = isManual ? 'Customer Supplied' : 'Amazon Suggested';
                
                return `
                    ${productInfo.image ? 
                        `<img src="${productInfo.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" alt="${productInfo.name}">` :
                        `<div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">IMG</div>`
                    }
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="asin-text" style="font-family: monospace; font-weight: 600; color: #232f3e; font-size: 0.9rem;">${asin}</span>
                            <span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; ${badgeClass}">${badgeText}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${productInfo.name}">${truncatedName}</div>
                    </div>
                    <button class="remove-btn" title="Remove" style="background-color: #dc3545; color: white; padding: 4px 8px; font-size: 1rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">×</button>
                `;
            };

            // Helper function to create loading tile HTML
            const createLoadingTileHTML = (asin, isManual = true) => {
                const badgeClass = isManual ? 'background-color: #fff3cd; color: #856404;' : 'background-color: #d4edda; color: #155724;';
                const badgeText = isManual ? 'Customer Supplied' : 'Amazon Suggested';
                
                return `
                    <div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
                        <div style="width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="asin-text" style="font-family: monospace; font-weight: 600; color: #232f3e; font-size: 0.9rem;">${asin}</span>
                            <span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; ${badgeClass}">${badgeText}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #666;">Loading product info...</div>
                    </div>
                    <button class="remove-btn" title="Remove" style="background-color: #dc3545; color: white; padding: 4px 8px; font-size: 1rem; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">×</button>
                `;
            };
            
            // Add new ASINs
            for (const asin of asinsToAdd) {
                const isManual = this.manualAsins.has(asin);
                const li = document.createElement('li');
                li.className = isManual ? 'manual-entry' : 'selected-alternate';
                li.style.cssText = `display: flex; align-items: center; gap: 12px; padding: 12px; background-color: ${isManual ? '#f8f9fa' : '#f8fff9'}; border-radius: 6px; border: 1px solid #e9ecef; border-left: 4px solid ${isManual ? '#ff9900' : '#28a745'}; margin-bottom: 8px;`;
                
                // Check if we have cached product info
                if (this.productInfoCache.has(asin)) {
                    // Use cached data immediately - no loading state needed
                    const cachedInfo = this.productInfoCache.get(asin);
                    li.innerHTML = createAsinTileHTML(asin, cachedInfo, isManual);
                    window.log(`⚡ Used cached data for ${asin}`);
                } else {
                    // Show loading state for new ASINs only
                    li.innerHTML = createLoadingTileHTML(asin, isManual);
                    window.log(`🔄 Loading new ASIN ${asin}`);
                    
                    // Fetch product info asynchronously for both manual ASINs and selected alternates
                    this.fetchProductInfoFromASIN(asin).then(productInfo => {
                        // Cache the result
                        this.productInfoCache.set(asin, productInfo);
                        
                        // Update the tile with fetched info
                        li.innerHTML = createAsinTileHTML(asin, productInfo, isManual);
                        window.log(`✅ Updated tile for ${asin} with fetched data (${isManual ? 'manual' : 'selected alternate'})`);
                    }).catch(error => {
                        // Cache error state as final fallback
                        const errorInfo = { asin, name: asin, image: '' };
                        this.productInfoCache.set(asin, errorInfo);
                        
                        // Update with error state
                        li.innerHTML = createAsinTileHTML(asin, errorInfo, isManual);
                        window.log(`❌ Updated tile for ${asin} with error state (${isManual ? 'manual' : 'selected alternate'})`);
                    });
                }
                
                // Insert in correct position (manual ASINs first, then selected alternates)
                if (isManual) {
                    // Find the last manual entry or insert at beginning
                    const lastManualEntry = asinList.querySelector('li.manual-entry:last-of-type');
                    if (lastManualEntry) {
                        lastManualEntry.insertAdjacentElement('afterend', li);
                    } else {
                        asinList.insertAdjacentElement('afterbegin', li);
                    }
                } else {
                    // Append selected alternates at the end
                    asinList.appendChild(li);
                }
                
                this.displayedAsins.add(asin);
            }
            
            window.log(`✅ Display updated: ${this.displayedAsins.size} ASINs displayed, ${this.productInfoCache.size} cached`);
        }
    };
    
    window.log('UI Components module loaded');

// Note: Global functions for remove buttons have been replaced with event delegation
// The remove functionality is now handled by the handleRemoveClick event listener
// in the initializeModalFunctionality function above.
