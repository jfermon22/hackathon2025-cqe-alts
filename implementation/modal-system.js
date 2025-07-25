// ==UserScript==
// @name         CQE Modal System Module
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  Modal creation, styling, and management for CQE Alternates Enhancement
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Modal system functionality
    window.MODAL_SYSTEM = {
        // Add CSS for loading spinner animation
        addSpinnerCSS: function() {
            if (document.getElementById('cqe-spinner-css')) return; // Already added
            
            const style = document.createElement('style');
            style.id = 'cqe-spinner-css';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        },

        // Create modal HTML structure with POC functionality
        createModal: function() {
            const modalHtml = `
                <div id="cqe-alternates-modal" class="cqe-modal-overlay" style="display: none;">
                    <div class="cqe-modal-content">
                        <div class="cqe-modal-header">
                            <h3>Add Alternate ASINs</h3>
                            <button class="cqe-modal-close" type="button">&times;</button>
                        </div>
                        
                        <div class="cqe-modal-body">
                            <div class="cqe-product-context" id="cqe-product-context">
                                <!-- Product context will be inserted here -->
                            </div>
                            
                            <!-- Manual ASIN Input Section -->
                            <div class="cqe-form-group">
                                <div class="cqe-input-group">
                                    <input type="text" id="cqe-asin-input" class="b-form-control" placeholder="Enter an alternate ASIN here" maxlength="10" />
                                    <button id="cqe-add-asin-btn" class="b-button">Add ASIN</button>
                                </div>
                                <div id="cqe-asin-error" class="cqe-error" style="display: none;"></div>
                                <div id="cqe-limit-warning" class="cqe-limit-warning">
                                    You can only add a maximum of 3 total alternates (manual + selected). Remove some items to add more.
                                </div>
                            </div>

                            <!-- Selected Alternates Display (Consolidated) -->
                            <div class="cqe-form-group" id="cqe-selected-alternates-display">
                                <div class="cqe-section-header">Selected Alternates <span id="cqe-asin-counter" class="cqe-asin-counter">(0/3)</span></div>
                                <ul class="cqe-asin-list" id="cqe-asin-list"></ul>
                            </div>

                            <!-- Alternates Information Form -->
                            <div class="cqe-form-group">
                                <div class="cqe-section-header">
                                    Alternates Information Form
                                    <div class="b-mt-small b-popover floating b-right b-hover" data-testid="alternates-info-popover-container">
                                        <button data-testid="alternates-info-popover-trigger" type="button" aria-expanded="false">
                                            <div class="b-alert b-info b-inline" role="alert"></div>
                                        </button>
                                        <div class="b-content" tabindex="-1" style="position: absolute; visibility: hidden; max-width: 276px;">
                                            <section class="b-body">
                                                Providing additional information about your intent and key attributes of your requested product will help improve suppliers' ability to respond with potential alternates.
                                                <br><br>
                                                ⚠️ Please do not include any personal identifying information. Any PII will be automatically removed and not sent to suppliers.
                                            </section>
                                            <div class="floating-arrow"></div>
                                        </div>
                                    </div>
                                </div>

                                <div class="cqe-form-field">
                                    <label for="cqe-intent">Customer Usage Intent</label>
                                    <textarea id="cqe-intent" class="b-form-control" rows="2" maxlength="200" placeholder="Describe what the product is intended for..."></textarea>
                                    <div class="character-count" id="cqe-intent-count">0/200</div>
                                </div>

                                <div class="cqe-form-field">
                                    <label for="cqe-item-description">Item Description</label>
                                    <textarea id="cqe-item-description" class="b-form-control" rows="2" maxlength="200" placeholder="Brief description of the item (e.g., laptop, blue pens, binder dividers)"></textarea>
                                    <div class="character-count" id="cqe-item-description-count">0/200</div>
                                </div>

                                <div class="cqe-form-field">
                                    <label for="cqe-must-have">Must-Have Attributes</label>
                                    <textarea id="cqe-must-have" class="b-form-control" rows="2" maxlength="200" placeholder="Critical product features required (e.g., 256 GB of storage space, USB-C connector)"></textarea>
                                    <div class="character-count" id="cqe-must-have-count">0/200</div>
                                </div>

                                <div class="cqe-form-field">
                                    <label for="cqe-preferred">Preferred Attributes</label>
                                    <textarea id="cqe-preferred" class="b-form-control" rows="2" maxlength="200" placeholder="Nice-to-have characteristics or preferences (e.g., Black color preferred, but blue is acceptable)"></textarea>
                                    <div class="character-count" id="cqe-preferred-count">0/200</div>
                                </div>
                            </div>

                            <!-- Suggested Alternates Section -->
                            <div id="cqe-suggested-alternates" class="cqe-alternates-section" style="display: none;"></div>

                            <!-- Action Buttons -->
                            <div class="cqe-form-group">
                                <button id="cqe-suggest-btn" class="b-button b-outline">Suggest Alternates</button>
                                <button id="cqe-submit-btn" class="b-button">Submit</button>
                                <button id="cqe-cancel-alternates" class="b-button b-outline">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Insert modal into DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = document.querySelector('#cqe-alternates-modal');
            
            return modal;
        },

        // Add CSS styles for the modal
        addModalStyles: function() {
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
                    
                    /* Product context - more compact */
                    .cqe-product-context {
                        padding: 0.75rem 1.5rem;
                        background: #f0f8ff;
                        border-bottom: 1px solid #ddd;
                        font-size: 0.85rem;
                    }
                    
                    /* POC Modal Functionality Styles */
                    .cqe-form-group {
                        margin: 0.75rem 1.5rem;
                    }
                    
                    /* Compact form fields */
                    .cqe-form-field {
                        margin-bottom: 0.75rem;
                    }
                    
                    .cqe-form-field:last-child {
                        margin-bottom: 0;
                    }
                    
                    /* CQE Modal-specific popover styles - scoped to prevent interference with Amazon's tooltips */
                    .cqe-modal-content .b-popover {
                        position: relative;
                        display: inline-block;
                        margin-left: 8px;
                    }
                    
                    .cqe-modal-content .b-popover button {
                        background: none !important;
                        border: none !important;
                        padding: 0 !important;
                        cursor: pointer;
                        display: inline-block;
                        vertical-align: middle;
                        box-shadow: none !important;
                        outline: none !important;
                        margin: 0 !important;
                    }
                    
                    .cqe-modal-content .b-popover button::before,
                    .cqe-modal-content .b-popover button::after {
                        display: none !important;
                    }
                    
                    .cqe-modal-content .b-popover .b-alert.b-info.b-inline {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background-color: #007185;
                        border: 1px solid #007185;
                        position: relative;
                        display: inline-block;
                        margin: 0;
                    }
                    
                    .cqe-modal-content .b-popover .b-alert.b-info.b-inline::before {
                        content: "i";
                        color: white;
                        font-size: 12px;
                        font-weight: bold;
                        font-style: normal;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        line-height: 1;
                    }
                    
                    .cqe-modal-content .b-popover button:hover .b-alert.b-info.b-inline {
                        background-color: #005a6b;
                        border-color: #005a6b;
                    }
                    
                    .cqe-modal-content .b-popover .b-content {
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                        padding: 0;
                        z-index: 1001;
                        width: max-content;
                    }
                    
                    .cqe-modal-content .b-popover .b-body {
                        padding: 12px 16px;
                        font-size: 0.9rem;
                        line-height: 1.4;
                        color: #333;
                    }
                    
                    .cqe-modal-content .b-popover .floating-arrow {
                        position: absolute;
                        width: 0;
                        height: 0;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-bottom: 8px solid white;
                        top: -8px;
                        left: 16px;
                    }
                    
                    .cqe-modal-content .b-popover .floating-arrow::before {
                        content: '';
                        position: absolute;
                        width: 0;
                        height: 0;
                        border-left: 9px solid transparent;
                        border-right: 9px solid transparent;
                        border-bottom: 9px solid #ddd;
                        top: -1px;
                        left: -9px;
                    }
                    
                    .cqe-modal-content .b-popover.b-hover:hover .b-content {
                        visibility: visible !important;
                    }
                    
                    .cqe-section-header {
                        font-size: 1.1rem;
                        font-weight: 600;
                        margin-bottom: 10px;
                        color: #232f3e;
                    }
                    
                    .cqe-input-group {
                        display: flex;
                        gap: 10px;
                        align-items: flex-start;
                        margin-bottom: 10px;
                    }
                    
                    .cqe-input-group .b-form-control {
                        flex: 1;
                    }
                    
                    .cqe-input-group .b-button {
                        white-space: nowrap;
                    }
                    
                    /* ASIN List styling */
                    .cqe-asin-list {
                        list-style: none;
                        padding: 0;
                        margin-top: 10px;
                    }
                    
                    .cqe-asin-list li {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                        padding: 8px 12px;
                        background-color: #f8f9fa;
                        border-radius: 4px;
                        border: 1px solid #e9ecef;
                    }
                    
                    .cqe-asin-list li.manual-entry {
                        border-left: 4px solid #ff9900;
                    }
                    
                    .cqe-asin-list li.selected-alternate {
                        border-left: 4px solid #28a745;
                        background-color: #f8fff9;
                    }
                    
                    .cqe-asin-list li .asin-text {
                        font-family: monospace;
                        font-weight: 600;
                        color: #232f3e;
                    }
                    
                    .cqe-asin-type-label {
                        font-size: 0.7rem;
                        padding: 2px 6px;
                        border-radius: 3px;
                        margin-left: 8px;
                        font-weight: 500;
                    }
                    
                    .manual-label {
                        background-color: #fff3cd;
                        color: #856404;
                    }
                    
                    .alternate-label {
                        background-color: #d4edda;
                        color: #155724;
                    }
                    
                    /* Counter and warnings */
                    .cqe-asin-counter {
                        font-size: 0.9rem;
                        color: #666;
                        font-weight: normal;
                    }
                    
                    .cqe-asin-counter.at-limit {
                        color: #dc3545;
                        font-weight: 600;
                    }
                    
                    .cqe-limit-warning {
                        background-color: #fff3cd;
                        border: 1px solid #ffeaa7;
                        color: #856404;
                        padding: 8px 12px;
                        border-radius: 4px;
                        font-size: 0.85rem;
                        margin-top: 10px;
                        display: none;
                    }
                    
                    .cqe-error {
                        color: #dc3545;
                        font-size: 0.9rem;
                        margin-top: 5px;
                        padding: 8px 12px;
                        background-color: #f8d7da;
                        border: 1px solid #f5c6cb;
                        border-radius: 4px;
                    }
                    
                    .cqe-warning {
                        color: #856404;
                        background-color: #fff3cd;
                        border: 1px solid #ffeaa7;
                        padding: 10px 12px;
                        border-radius: 4px;
                        font-size: 0.9rem;
                        margin-top: 15px;
                    }
                    
                    .remove-btn {
                        background-color: #dc3545;
                        color: white;
                        padding: 2px 6px;
                        font-size: 1rem;
                        font-weight: bold;
                        border: none;
                        border-radius: 50%;
                        cursor: pointer;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        line-height: 1;
                    }
                    
                    .remove-btn:hover {
                        background-color: #c82333;
                    }
                    
                    /* Alternates section */
                    .cqe-alternates-section {
                        margin: 1rem 1.5rem;
                        padding-top: 20px;
                        border-top: 1px solid #e9ecef;
                    }
                    
                    .alternate-tile {
                        display: flex;
                        align-items: center;
                        border: 2px solid #e9ecef;
                        border-radius: 6px;
                        margin-bottom: 10px;
                        padding: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        background: white;
                    }
                    
                    .alternate-tile:hover {
                        border-color: #ff9900;
                        background-color: #fff8f0;
                    }
                    
                    .alternate-tile img {
                        width: 60px;
                        height: 60px;
                        object-fit: cover;
                        margin-right: 15px;
                        border-radius: 4px;
                        border: 1px solid #ddd;
                    }
                    
                    .alternate-tile.selected {
                        background-color: #fff8f0;
                        border-color: #ff9900;
                    }
                    
                    .alternate-tile .product-info {
                        flex: 1;
                    }
                    
                    .alternate-tile .product-name {
                        font-weight: 600;
                        margin-bottom: 4px;
                        color: #232f3e;
                    }
                    
                    .alternate-tile .product-description {
                        color: #666;
                        margin-bottom: 4px;
                        font-size: 0.9rem;
                    }
                    
                    .alternate-tile .product-asin {
                        font-size: 0.8rem;
                        color: #999;
                        font-family: monospace;
                    }
                    
                    /* Character count styling */
                    .character-count {
                        font-size: 0.75rem;
                        color: #666;
                        text-align: right;
                        margin-top: 2px;
                        font-family: monospace;
                    }
                    
                    .character-count.warning {
                        color: #ff9800;
                    }
                    
                    .character-count.error {
                        color: #f44336;
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
        },

        // Open modal with product context
        openModal: function(productData) {
            let modal = document.querySelector('#cqe-alternates-modal');
            
            // Create modal if it doesn't exist
            if (!modal) {
                modal = this.createModal();
            }
            
            // Store product data globally for search module access
            window.currentProductData = productData;
            
            // Set the original ASIN in UI_COMPONENTS to prevent adding it as alternate
            if (window.UI_COMPONENTS && productData && productData.asin) {
                window.UI_COMPONENTS.originalAsin = productData.asin.toUpperCase();
                window.log('Original ASIN set for validation:', window.UI_COMPONENTS.originalAsin);
            }
            
            // Update product context with enhanced display
            const contextDiv = document.querySelector('#cqe-product-context');
            if (contextDiv && productData) {
                let contextHTML = '';
                
                // Check if we have image and name (from table row)
                if (productData.image && productData.name && productData.name !== 'Unknown Product' && productData.name !== productData.asin) {
                    // Enhanced display with image and product info
                    contextHTML = `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${productData.image}" alt="${productData.name}" 
                                 style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 4px; color: #232f3e;">${productData.name}</div>
                                <div style="font-size: 0.9rem; color: #666;">
                                    <strong>ASIN:</strong> ${productData.asin}
                                    ${productData.quantity ? ` | <strong>Quantity:</strong> ${productData.quantity}` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // Fallback to simple display (legacy behavior)
                    if (productData.asin) {
                        contextHTML += `<strong>ASIN:</strong> ${productData.asin}`;
                    }
                    
                    if (productData.quantity) {
                        contextHTML += ` | <strong>Quantity:</strong> ${productData.quantity}`;
                    }
                }
                
                contextDiv.innerHTML = contextHTML;
            }
            
            // Show modal
            modal.style.display = 'flex';
            
            // Focus on ASIN input
            setTimeout(() => {
                const asinInput = document.querySelector('#cqe-asin-input');
                if (asinInput) {
                    asinInput.focus();
                }
            }, 100);
            
            window.log('Modal opened for product:', productData);
        },

        // Close modal
        closeModal: function() {
            const modal = document.querySelector('#cqe-alternates-modal');
            if (modal) {
                modal.style.display = 'none';
                window.log('Modal closed');
            }
        }
    };
    
    window.log('Modal System module loaded');
})();
