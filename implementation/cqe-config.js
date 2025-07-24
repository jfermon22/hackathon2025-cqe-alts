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
    
    // Bedrock Agent Configuration
    window.BEDROCK_CONFIG = {
        region: 'us-west-2',
        agentId: 'CAP1I3RZLN',
        agentAliasId: 'CAP1I3RZLN',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
    };
    
    // Amazon Search Configuration
    window.SEARCH_CONFIG = {
        MAX_RESULTS: 4,
        TIMEOUT: 15000,
        BASE_URL: 'https://www.amazon.com/s?k=',
        RETRY_ATTEMPTS: 2
    };
    
    // Analytics Configuration
    window.ANALYTICS_CONFIG = {
        STORAGE_KEY: 'cqe_alternates_analytics',
        CONVERSATION_STORAGE_KEY: 'cqe_alternates_conversation_state',
        EXPIRY_HOURS: 24
    };
    
    // UI Constants
    window.UI_CONSTANTS = {
        MAX_ALTERNATES: 3,
        ASIN_REGEX: /^([0-9]{9}[0-9X]|[A-Z][A-Z0-9]{9})$/,
        CHARACTER_LIMITS: {
            intent: 200,
            itemDescription: 200,
            mustHave: 200,
            preferred: 200
        }
    };
    
    // Debug logging function
    window.log = function(message, data = null) {
        console.log(`[CQE Alternates] ${message}`, data || '');
    };
    
    window.log('CQE Configuration module loaded');
})();
