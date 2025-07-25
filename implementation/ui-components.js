// ==UserScript==
// @name         CQE UI Components Module
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  UI components and interaction handlers for CQE Alternates Enhancement
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // UI Components and handlers
    window.UI_COMPONENTS = {
        // Global state for modal functionality
        manualAsins: new Set(),
        selectedAlternates: new Set(),
        originalAsin: null, // Store the original requested ASIN
        
        // Initialize modal functionality
        initializeModalFunctionality: function() {
            // Don't reset global state if it already exists (preserve data during re-initialization)
            if (!this.manualAsins) this.manualAsins = new Set();
            if (!this.selectedAlternates) this.selectedAlternates = new Set();
            
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

            // Show error message
            const showError = (message) => {
                if (!asinError) return;
                asinError.textContent = message;
                asinError.style.display = 'block';
                setTimeout(() => {
                    asinError.style.display = 'none';
                }, 5000);
            };

            // Add manual ASIN to the list
            const addASIN = () => {
                if (!asinInput) return;
                
                const value = asinInput.value.trim().toUpperCase();
                
                // Check limit first
                if (getTotalAlternatesCount() >= MAX_ALTERNATES) {
                    showError(`Maximum of ${MAX_ALTERNATES} total alternates allowed. Remove some items to add more.`);
                    return false;
                }
                
                // Validate ASIN format
                if (!ASIN_REGEX.test(value)) {
                    showError('Invalid ASIN format. Must be exactly 10 alphanumeric characters.');
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
                
                // Add to manual ASINs set
                this.manualAsins.add(value);
                
                asinInput.value = '';
                
                // Update consolidated display and counter
                updateSelectedAlternatesDisplay();
                updateCounterAndUI();
                
                return true;
            };

            // Update the consolidated alternates display
            const updateSelectedAlternatesDisplay = () => {
                if (!selectedAlternatesDisplay || !asinList) return;
                
                // Always show the section since we have the input field there
                selectedAlternatesDisplay.style.display = 'block';
                asinList.innerHTML = '';
                
                // Add manual ASINs first
                this.manualAsins.forEach(value => {
                    const li = document.createElement('li');
                    li.className = 'manual-entry';
                    li.innerHTML = `
                        <div>
                            <span class="asin-text">${value}</span>
                            <span class="cqe-asin-type-label manual-label">Customer Supplied</span>
                        </div>
                        <button class="remove-btn" onclick="(function(asin) { console.log('[CQE Alternates] 🗑️ Removing manual ASIN:', asin); try { var li = event.target.closest('li'); if (li) { li.remove(); } if (window.UI_COMPONENTS && window.UI_COMPONENTS.manualAsins) { window.UI_COMPONENTS.manualAsins.delete(asin); var counter = document.getElementById('cqe-asin-counter'); if (counter) { var totalCount = (window.UI_COMPONENTS.manualAsins ? window.UI_COMPONENTS.manualAsins.size : 0) + (window.UI_COMPONENTS.selectedAlternates ? window.UI_COMPONENTS.selectedAlternates.size : 0); counter.textContent = '(' + totalCount + '/3)'; } } console.log('[CQE Alternates] ✅ Manual ASIN removed successfully'); } catch(e) { console.error('[CQE Alternates] ❌ Removal error:', e); } })('${value}')" title="Remove">×</button>
                    `;
                    asinList.appendChild(li);
                });
                
                // Add selected alternates
                this.selectedAlternates.forEach(asin => {
                    const product = mockProducts.find(p => p.asin === asin);
                    const li = document.createElement('li');
                    li.className = 'selected-alternate';
                    li.innerHTML = `
                        <div>
                            <span class="asin-text">${asin}</span>
                            <span class="cqe-asin-type-label alternate-label">Amazon Suggested</span>
                            ${product && product.name ? `<div style="font-size: 0.8rem; color: #666; margin-top: 2px;">${product.name}</div>` : ''}
                        </div>
                        <button class="remove-btn" onclick="(function(asin) { console.log('[CQE Alternates] 🗑️ Removing selected alternate:', asin); try { var li = event.target.closest('li'); if (li) { li.remove(); } if (window.UI_COMPONENTS && window.UI_COMPONENTS.selectedAlternates) { window.UI_COMPONENTS.selectedAlternates.delete(asin); var counter = document.getElementById('cqe-asin-counter'); if (counter) { var totalCount = (window.UI_COMPONENTS.manualAsins ? window.UI_COMPONENTS.manualAsins.size : 0) + (window.UI_COMPONENTS.selectedAlternates ? window.UI_COMPONENTS.selectedAlternates.size : 0); counter.textContent = '(' + totalCount + '/3)'; } var tiles = document.querySelectorAll('.alternate-tile[data-asin=\"' + asin + '\"]'); tiles.forEach(function(tile) { tile.classList.remove('selected'); }); } console.log('[CQE Alternates] ✅ Selected alternate removed successfully'); } catch(e) { console.error('[CQE Alternates] ❌ Removal error:', e); } })('${asin}')" title="Remove">×</button>
                    `;
                    asinList.appendChild(li);
                });
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
                
                // Show loading state
                const container = document.getElementById('cqe-suggested-alternates');
                if (!container) return;
                
                container.style.display = 'block';
                container.innerHTML = `
                    <div class="cqe-section-header">Generating Search Terms with AI...</div>
                    <div style="text-align: center; padding: 20px;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 10px; color: #666;">Using AI to generate optimized search terms...</p>
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
                            window.log('✅ Agent generated search term successfully:', agentResult.searchTerm);
                            
                            // Update loading message
                            container.innerHTML = `
                                <div class="cqe-section-header">Searching Amazon with AI-Generated Terms...</div>
                                <div style="text-align: center; padding: 20px;">
                                    <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                    <p style="margin-top: 10px; color: #666;">Search term: "${agentResult.searchTerm}"</p>
                                    <p style="color: #666;">Finding products on Amazon...</p>
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
                    <div class="cqe-section-header">Searching for Alternates...</div>
                    <div style="text-align: center; padding: 20px;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #007185; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 10px; color: #666;">Finding relevant alternates based on your requirements...</p>
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
                
                container.innerHTML = `
                    <div class="cqe-section-header">
                        Select Suggested Alternates
                        <button data-testid="select-alternates-popover-trigger" type="button" class="cqe-tooltip-btn" aria-expanded="false" title="Click on alternates below to select them for inclusion in your request (${getTotalAlternatesCount()}/${MAX_ALTERNATES} used)">
                            <div class="b-alert b-info b-inline" role="alert"></div>
                        </button>
                    </div>
                `;
                
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

            // Submit the form with multi-function agent integration
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
                
                // Validate payload
                if (payload.allAsins.length === 0) {
                    showError('Please add at least one ASIN (manual or selected alternate) before submitting.');
                    return;
                }
                
                if (!payload.intent && !payload.itemDescription && !payload.mustHave && !payload.preferred) {
                    showError('Please provide at least some information in the form fields.');
                    return;
                }
                
                window.log('Submitting payload to downstream services:', payload);
                
                // Show loading state for supplier summary generation
                const submitBtn = document.getElementById('cqe-submit-btn');
                const originalText = submitBtn ? submitBtn.textContent : 'Submit';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Generating Summary...';
                }
                
                try {
                    // Generate supplier summary using multi-function agent
                    if (window.generateSupplierSummaryWithAgent) {
                        window.log('🤖 Calling multi-function agent for supplier summary generation');
                        
                        const formData = {
                            originalProduct: window.currentProductData?.name || '',
                            customerUsageIntent: payload.intent,
                            itemDescription: payload.itemDescription,
                            mustHaveAttributes: payload.mustHave,
                            preferredAttributes: payload.preferred
                        };
                        
                        const summaryResult = await window.generateSupplierSummaryWithAgent(formData);
                        
                        if (summaryResult.success && summaryResult.summary) {
                            window.log('✅ Supplier summary generated successfully');
                            
                            // Create detailed summary for user including AI-generated summary
                            let summary = 'Form submitted successfully!\n\n';
                            summary += `Manual ASINs (${payload.manualAsins.length}): ${payload.manualAsins.join(', ') || 'None'}\n`;
                            summary += `Selected Alternates (${payload.selectedAlternates.length}): ${payload.selectedAlternates.join(', ') || 'None'}\n`;
                            summary += `Total ASINs: ${payload.allAsins.length}/${MAX_ALTERNATES}\n\n`;
                            summary += 'AI-Generated Supplier Summary:\n';
                            summary += '─'.repeat(50) + '\n';
                            summary += summaryResult.summary + '\n';
                            summary += '─'.repeat(50) + '\n\n';
                            summary += 'Next steps:\n- Summary has been generated for suppliers\n- Product search will find additional matches\n- Suppliers will receive the AI-optimized context';
                            
                            alert(summary);
                        } else {
                            window.log('❌ Supplier summary generation failed, proceeding without AI summary');
                            
                            // Fallback to original submission without AI summary
                            let summary = 'Form submitted successfully!\n\n';
                            summary += `Manual ASINs (${payload.manualAsins.length}): ${payload.manualAsins.join(', ') || 'None'}\n`;
                            summary += `Selected Alternates (${payload.selectedAlternates.length}): ${payload.selectedAlternates.join(', ') || 'None'}\n`;
                            summary += `Total ASINs: ${payload.allAsins.length}/${MAX_ALTERNATES}\n\n`;
                            summary += '⚠️ AI summary generation temporarily unavailable\n';
                            summary += 'Next steps:\n- Form data will be processed manually\n- Product search will find additional matches\n- Suppliers will receive basic context';
                            
                            alert(summary);
                        }
                    } else {
                        window.log('❌ Multi-function agent not available for supplier summary');
                        
                        // Fallback to original submission
                        let summary = 'Form submitted successfully!\n\n';
                        summary += `Manual ASINs (${payload.manualAsins.length}): ${payload.manualAsins.join(', ') || 'None'}\n`;
                        summary += `Selected Alternates (${payload.selectedAlternates.length}): ${payload.selectedAlternates.join(', ') || 'None'}\n`;
                        summary += `Total ASINs: ${payload.allAsins.length}/${MAX_ALTERNATES}\n\n`;
                        summary += 'Next steps:\n- Form data will be processed\n- Product search will find additional matches\n- Suppliers will receive context';
                        
                        alert(summary);
                    }
                } catch (error) {
                    window.log('❌ Error in supplier summary generation:', error);
                    
                    // Show error but still allow submission
                    let summary = 'Form submitted with warnings!\n\n';
                    summary += `Manual ASINs (${payload.manualAsins.length}): ${payload.manualAsins.join(', ') || 'None'}\n`;
                    summary += `Selected Alternates (${payload.selectedAlternates.length}): ${payload.selectedAlternates.join(', ') || 'None'}\n`;
                    summary += `Total ASINs: ${payload.allAsins.length}/${MAX_ALTERNATES}\n\n`;
                    summary += `⚠️ AI processing error: ${error.message}\n`;
                    summary += 'Next steps:\n- Form data will be processed manually\n- Product search will find additional matches\n- Suppliers will receive basic context';
                    
                    alert(summary);
                } finally {
                    // Restore button state
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
                
                // Close modal after successful submission
                if (window.MODAL_SYSTEM) {
                    window.MODAL_SYSTEM.closeModal();
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

                // Auto-format ASIN input to uppercase
                asinInput.addEventListener('input', function(e) {
                    e.target.value = e.target.value.toUpperCase();
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
            
            // Setup character count listeners
            setupCharacterCountListeners();
            
            // Initialize character counts
            updateAllCharacterCounts();
            
            window.log('Modal functionality initialized successfully');
        }
    };
    
    window.log('UI Components module loaded');
})();

// Global functions for remove buttons (called from HTML onclick)
// These MUST be outside the IIFE to be accessible globally
window.cqeRemoveSelectedAlternate = function(asin) {
    console.log('[CQE Alternates] 🗑️ cqeRemoveSelectedAlternate called with ASIN:', asin);
    console.log('[CQE Alternates] 🔍 Function context check:', {
        'window.UI_COMPONENTS exists': !!window.UI_COMPONENTS,
        'selectedAlternates exists': !!(window.UI_COMPONENTS && window.UI_COMPONENTS.selectedAlternates),
        'ASIN in set': !!(window.UI_COMPONENTS && window.UI_COMPONENTS.selectedAlternates && window.UI_COMPONENTS.selectedAlternates.has(asin))
    });
    
    window.log('Removing selected alternate:', asin);
    if (window.UI_COMPONENTS && window.UI_COMPONENTS.selectedAlternates && window.UI_COMPONENTS.selectedAlternates.has(asin)) {
        window.UI_COMPONENTS.selectedAlternates.delete(asin);
        // Re-initialize to update display
        window.UI_COMPONENTS.initializeModalFunctionality();
        window.log('Selected alternate removed:', asin);
        console.log('[CQE Alternates] ✅ Selected alternate successfully removed');
    } else {
        console.error('[CQE Alternates] ❌ Could not remove selected alternate - missing dependencies');
    }
};

window.cqeRemoveManualASIN = function(asin) {
    console.log('[CQE Alternates] 🗑️ cqeRemoveManualASIN called with ASIN:', asin);
    console.log('[CQE Alternates] 🔍 Function context check:', {
        'window.UI_COMPONENTS exists': !!window.UI_COMPONENTS,
        'manualAsins exists': !!(window.UI_COMPONENTS && window.UI_COMPONENTS.manualAsins),
        'ASIN in set': !!(window.UI_COMPONENTS && window.UI_COMPONENTS.manualAsins && window.UI_COMPONENTS.manualAsins.has(asin))
    });
    
    window.log('Removing manual ASIN:', asin);
    if (window.UI_COMPONENTS && window.UI_COMPONENTS.manualAsins && window.UI_COMPONENTS.manualAsins.has(asin)) {
        window.UI_COMPONENTS.manualAsins.delete(asin);
        // Re-initialize to update display
        window.UI_COMPONENTS.initializeModalFunctionality();
        window.log('Manual ASIN removed:', asin);
        console.log('[CQE Alternates] ✅ Manual ASIN successfully removed');
    } else {
        console.error('[CQE Alternates] ❌ Could not remove manual ASIN - missing dependencies');
    }
};

// Function to ensure global functions are always available
window.ensureCQEGlobalFunctions = function() {
    console.log('[CQE Alternates] 🔧 Ensuring global functions are available...');
    
    const functionsStatus = {
        cqeRemoveManualASIN: typeof window.cqeRemoveManualASIN,
        cqeRemoveSelectedAlternate: typeof window.cqeRemoveSelectedAlternate
    };
    
    console.log('[CQE Alternates] 📊 Global functions status:', functionsStatus);
    
    // If functions are missing, recreate them
    if (typeof window.cqeRemoveManualASIN !== 'function') {
        console.log('[CQE Alternates] 🔧 Recreating cqeRemoveManualASIN...');
        window.cqeRemoveManualASIN = function(asin) {
            console.log('[CQE Alternates] 🗑️ [RECREATED] cqeRemoveManualASIN called with ASIN:', asin);
            if (window.UI_COMPONENTS && window.UI_COMPONENTS.manualAsins && window.UI_COMPONENTS.manualAsins.has(asin)) {
                window.UI_COMPONENTS.manualAsins.delete(asin);
                window.UI_COMPONENTS.initializeModalFunctionality();
                console.log('[CQE Alternates] ✅ [RECREATED] Manual ASIN successfully removed');
            }
        };
    }
    
    if (typeof window.cqeRemoveSelectedAlternate !== 'function') {
        console.log('[CQE Alternates] 🔧 Recreating cqeRemoveSelectedAlternate...');
        window.cqeRemoveSelectedAlternate = function(asin) {
            console.log('[CQE Alternates] 🗑️ [RECREATED] cqeRemoveSelectedAlternate called with ASIN:', asin);
            if (window.UI_COMPONENTS && window.UI_COMPONENTS.selectedAlternates && window.UI_COMPONENTS.selectedAlternates.has(asin)) {
                window.UI_COMPONENTS.selectedAlternates.delete(asin);
                window.UI_COMPONENTS.initializeModalFunctionality();
                console.log('[CQE Alternates] ✅ [RECREATED] Selected alternate successfully removed');
            }
        };
    }
    
    console.log('[CQE Alternates] ✅ Global functions ensured');
    return functionsStatus;
};
