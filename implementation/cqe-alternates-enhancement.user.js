// ==UserScript==
// @name         CQE Alternate Selection Enhancement
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  Enhanced alternate selection for Custom Quotes Engine
// @author       Amazon
// @match        https://www.amazon.com/ab/bulk-order/input*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    
    // Load modules using GM_xmlhttpRequest from GitHub
    function loadModules() {
        const baseUrl = 'https://raw.githubusercontent.com/jfermon22/hackathon2025-cqe-alts/refs/heads/main/implementation/';
        const moduleFiles = [
            { url: baseUrl + 'cqe-config.js', name: 'cqe-config.js' },
            { url: baseUrl + 'asin-validation.js', name: 'asin-validation.js' },
            { url: baseUrl + 'modal-system.js', name: 'modal-system.js' },
            { url: baseUrl + 'amazon-search.js', name: 'amazon-search.js' },
            { url: baseUrl + 'api-integration.js', name: 'api-integration.js' },
            { url: baseUrl + 'ui-components.js', name: 'ui-components.js' },
            { url: baseUrl + 'main-initialization.js', name: 'main-initialization.js' }
        ];
        
        return new Promise((resolve) => {
            let loadedCount = 0;
            const totalModules = moduleFiles.length;
            
            // Load modules sequentially to ensure proper order
            function loadNextModule(index) {
                if (index >= moduleFiles.length) {
                    console.log(`[CQE Alternates] Loaded ${loadedCount}/${totalModules} modules`);
                    resolve();
                    return;
                }
                
                const module = moduleFiles[index];
                
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: module.url,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    onload: function(response) {
                        if (response.status === 200 && response.responseText) {
                            try {
                                // Strip IIFE wrapper to allow global scope execution
                                let moduleCode = response.responseText;
                                
                                // Remove the outer IIFE wrapper: (function() { 'use strict'; ... })();
                                const iifePattern = /^\s*\(function\(\)\s*\{\s*['"]use strict['"];\s*([\s\S]*)\s*\}\)\(\);\s*$/;
                                const match = moduleCode.match(iifePattern);
                                
                                if (match) {
                                    moduleCode = match[1]; // Extract the inner code
                                }
                                
                                // Execute the code in global scope using eval (safer than Function for this use case)
                                eval(moduleCode);
                                
                                loadedCount++;
                                
                            } catch (error) {
                                console.error(`[CQE Alternates] Error executing ${module.name}:`, error);
                            }
                        } else {
                            console.error(`[CQE Alternates] Failed to load ${module.name}: HTTP ${response.status}`);
                        }
                        
                        // Load next module
                        setTimeout(() => loadNextModule(index + 1), 100);
                    },
                    onerror: function(error) {
                        console.error(`[CQE Alternates] Network error loading ${module.name}:`, error);
                        // Continue with next module
                        setTimeout(() => loadNextModule(index + 1), 100);
                    },
                    ontimeout: function() {
                        console.error(`[CQE Alternates] Timeout loading ${module.name}`);
                        // Continue with next module
                        setTimeout(() => loadNextModule(index + 1), 100);
                    },
                    timeout: window.UI_CONSTANTS ? window.UI_CONSTANTS.MODULE_LOAD_TIMEOUT : 10000
                });
            }
            
            // Start loading the first module
            loadNextModule(0);
            
            // Overall fallback timeout
            setTimeout(() => {
                console.log('[CQE Alternates] Module loading timeout, proceeding anyway');
                resolve();
            }, window.UI_CONSTANTS ? window.UI_CONSTANTS.MODULE_WAIT_TIMEOUT : 30000);
        });
    }
    
    // Wait for all modules to be loaded
    function waitForModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkModules = () => {
                attempts++;
                
                if (window.CQE_SELECTORS && 
                    window.ASIN_VALIDATION && 
                    window.MODAL_SYSTEM && 
                    window.AMAZON_SEARCH_MODULE && 
                    window.API_INTEGRATION && 
                    window.UI_COMPONENTS && 
                    window.CQE_MAIN) {
                    
                    console.log('[CQE Alternates] All modules ready');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.log('[CQE Alternates] Module timeout - proceeding with available modules');
                    resolve();
                } else {
                    setTimeout(checkModules, 100);
                }
            };
            checkModules();
        });
    }
    
    // Initialize the application
    async function initialize() {
        try {
            // First try to load modules dynamically
            await loadModules();
            
            // Then wait for all modules to be available
            await waitForModules();
            
            // Initialize the main CQE functionality using the loaded modules
            if (window.CQE_MAIN && window.CQE_MAIN.initialize) {
                window.CQE_MAIN.initialize();
            } else {
                console.log('[CQE Alternates] CQE_MAIN module not available, falling back to basic initialization');
                
                // Basic fallback initialization
                if (window.CQE_MAIN && window.CQE_MAIN.isCQEQuotePage && window.CQE_MAIN.isCQEQuotePage()) {
                    // Add modal styles
                    if (window.MODAL_SYSTEM) {
                        window.MODAL_SYSTEM.addModalStyles();
                        window.MODAL_SYSTEM.addSpinnerCSS();
                    }
                    
                    // Add the alternates button
                    if (window.CQE_MAIN && window.CQE_MAIN.addAlternatesButton) {
                        window.CQE_MAIN.addAlternatesButton();
                    }
                }
            }
            
            console.log('[CQE Alternates] CQE Alternates Enhancement initialized using modular approach');
            
        } catch (error) {
            console.log('[CQE Alternates] Error during initialization:', error);
            console.error('CQE Alternates Enhancement initialization failed:', error);
        }
    }
    
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Debug function to check module status
    window.debugCQEModules = function() {
        console.log('=== CQE Modules Status ===');
        console.log('CQE_SELECTORS:', !!window.CQE_SELECTORS);
        console.log('ASIN_VALIDATION:', !!window.ASIN_VALIDATION);
        console.log('MODAL_SYSTEM:', !!window.MODAL_SYSTEM);
        console.log('AMAZON_SEARCH_MODULE:', !!window.AMAZON_SEARCH_MODULE);
        console.log('API_INTEGRATION:', !!window.API_INTEGRATION);
        console.log('UI_COMPONENTS:', !!window.UI_COMPONENTS);
        console.log('CQE_MAIN:', !!window.CQE_MAIN);
        console.log('=== End Module Status ===');
        
        // Try manual initialization
        if (window.CQE_MAIN && window.CQE_MAIN.initialize) {
            console.log('Attempting manual initialization...');
            window.CQE_MAIN.initialize();
        }
    };
    
})();
