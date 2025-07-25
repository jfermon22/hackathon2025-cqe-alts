// ==UserScript==
// @name         CQE Configuration Module
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  Configuration constants and selectors for CQE Alternates Enhancement
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration and selectors based on HTML analysis
    window.CQE_SELECTORS = {
        productTable: '.ink_Table_1smr14t0.ink_Table_1smr14t1',
        productRows: 'tbody tr[data-key]',
        dropdownMenus: '.b-dropdown-menu',
        modalRoot: '#offer-selection-slider-root',
        asinInput: '#add-asin-or-isbn-form',
        pageHeader: '#cqe_quote_request_a_quote_header'
    };
    
    // HTTP API Configuration
    window.API_CONFIG = {
        apiEndpoint: 'https://dzzzjrtgc8.execute-api.us-west-2.amazonaws.com/invoke-agent',
        timeout: 30000, // 30 second timeout
        maxRetries: 3,
        retryDelay: 1000 // 1 second base delay
    };
    
    // Amazon Search Configuration
    window.SEARCH_CONFIG = {
        MAX_RESULTS: 4,
        TIMEOUT: 15000,
        BASE_URL: 'https://www.amazon.com/s?k=',
        RETRY_ATTEMPTS: 2
    };
    
    // ASIN Validation Configuration
    window.ASIN_CONFIG = {
        // Standard ASIN regex pattern - supports both formats:
        // - 10-digit numeric with optional X: 0123456789, 012345678X
        // - Letter + 9 alphanumeric: B08N5WRWNW
        REGEX: /^([0-9]{9}[0-9X]|[A-Z][A-Z0-9]{9})$/,
        // Simplified regex for UI validation (10 alphanumeric characters)
        UI_REGEX: /^[A-Z0-9]{10}$/i
    };
    
    // UI Constants
    window.UI_CONSTANTS = {
        MAX_ALTERNATES: 3,
        MODULE_LOAD_TIMEOUT: 10000, // 10 seconds per module
        MODULE_WAIT_TIMEOUT: 30000, // 30 seconds total wait
        CHARACTER_LIMITS: {
            customerUsageIntent: 200,
            itemDescription: 200,
            mustHaveAttributes: 200,
            preferredAttributes: 200
        }
    };
    
    // Debug logging function
    window.log = function(message, data = null) {
        console.log(`[CQE Alternates] ${message}`, data || '');
    };
    
    window.log('CQE Configuration module loaded');
})();
