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
    
    // Load modules using GM_xmlhttpRequest to bypass CORS
    function loadModules() {
        const moduleFiles = [
            { url: 'https://drive.google.com/uc?export=download&id=19YjvSHvE8qUXGtepa3eXyYpxhB-Zn3tz', name: 'cqe-config.js' },
            { url: 'https://drive.google.com/uc?export=download&id=1iGQu1aAJKrfwAYT6JRriw_DheSxrO4g1', name: 'asin-validation.js' },
            { url: 'https://drive.google.com/uc?export=download&id=1roL8pFANtWp8n2Z9ggVW4IuUfLOpvGPH', name: 'modal-system.js' },
            { url: 'https://drive.google.com/uc?export=download&id=12Zjz9-OKV43I2d3gPndEMgiAxgMlIH71', name: 'amazon-search.js' },
            { url: 'https://drive.google.com/uc?export=download&id=1zwgSMqJnoRVNU7JbMspLl6MLYKCDSKey', name: 'bedrock-integration.js' },
            { url: 'https://drive.google.com/uc?export=download&id=1Z3sQNoRE13SJAfTo0pvImByAlHRieOOX', name: 'ui-components.js' },
            { url: 'https://drive.google.com/uc?export=download&id=1azvKRtNA70cEnktte1zFTqUwAyhjR0jK', name: 'main-initialization.js' }
        ];
        
        console.log('[CQE Alternates] Loading modules via GM_xmlhttpRequest (bypassing CORS)...');
        
        return new Promise((resolve) => {
            let loadedCount = 0;
            const totalModules = moduleFiles.length;
            
            // Load modules sequentially to ensure proper order
            function loadNextModule(index) {
                if (index >= moduleFiles.length) {
                    console.log(`[CQE Alternates] All modules processed (${loadedCount}/${totalModules} successful)`);
                    resolve();
                    return;
                }
                
                const module = moduleFiles[index];
                console.log(`[CQE Alternates] 🔄 Loading module ${index + 1}/${totalModules}: ${module.name}`);
                console.log(`[CQE Alternates] 🌐 URL: ${module.url}`);
                
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: module.url,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    },
                    onload: function(response) {
                        console.log(`[CQE Alternates] 📥 Response for ${module.name}:`, {
                            status: response.status,
                            statusText: response.statusText,
                            responseLength: response.responseText ? response.responseText.length : 0,
                            contentType: response.responseHeaders
                        });
                        
                        if (response.status === 200 && response.responseText) {
                            try {
                                // Execute the module code
                                console.log(`[CQE Alternates] 🔧 Executing ${module.name}...`);
                                
                                // Create a function to execute the code in the global scope
                                const executeCode = new Function(response.responseText);
                                executeCode();
                                
                                loadedCount++;
                                console.log(`[CQE Alternates] ✅ Successfully loaded and executed ${module.name} (${loadedCount}/${totalModules})`);
                                
                            } catch (error) {
                                console.error(`[CQE Alternates] ❌ Error executing ${module.name}:`, error);
                                console.error(`[CQE Alternates] 📄 Code preview:`, response.responseText.substring(0, 200) + '...');
                            }
                        } else {
                            console.error(`[CQE Alternates] ❌ Failed to load ${module.name}: HTTP ${response.status}`);
                            console.error(`[CQE Alternates] 📄 Response preview:`, response.responseText ? response.responseText.substring(0, 200) + '...' : 'No response text');
                        }
                        
                        // Load next module
                        setTimeout(() => loadNextModule(index + 1), 100);
                    },
                    onerror: function(error) {
                        console.error(`[CQE Alternates] ❌ Network error loading ${module.name}:`, error);
                        // Continue with next module
                        setTimeout(() => loadNextModule(index + 1), 100);
                    },
                    ontimeout: function() {
                        console.error(`[CQE Alternates] ⏰ Timeout loading ${module.name}`);
                        // Continue with next module
                        setTimeout(() => loadNextModule(index + 1), 100);
                    },
                    timeout: 10000 // 10 second timeout per module
                });
            }
            
            // Start loading the first module
            loadNextModule(0);
            
            // Overall fallback timeout
            setTimeout(() => {
                console.log('[CQE Alternates] Overall module loading timeout, proceeding anyway');
                resolve();
            }, 30000); // 30 seconds total
        });
    }
    
    // Wait for all modules to be loaded
    function waitForModules() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkModules = () => {
                attempts++;
                
                // Debug: Show which modules are loaded
                const moduleStatus = {
                    CQE_SELECTORS: !!window.CQE_SELECTORS,
                    ASIN_VALIDATION: !!window.ASIN_VALIDATION,
                    MODAL_SYSTEM: !!window.MODAL_SYSTEM,
                    AMAZON_SEARCH_MODULE: !!window.AMAZON_SEARCH_MODULE,
                    BEDROCK_AGENT_INTEGRATION: !!window.BEDROCK_AGENT_INTEGRATION,
                    UI_COMPONENTS: !!window.UI_COMPONENTS,
                    CQE_MAIN: !!window.CQE_MAIN
                };
                
                console.log(`[CQE Alternates] Module loading attempt ${attempts}/${maxAttempts}:`, moduleStatus);
                
                if (window.CQE_SELECTORS && 
                    window.ASIN_VALIDATION && 
                    window.MODAL_SYSTEM && 
                    window.AMAZON_SEARCH_MODULE && 
                    window.BEDROCK_AGENT_INTEGRATION && 
                    window.UI_COMPONENTS && 
                    window.CQE_MAIN) {
                    
                    console.log('[CQE Alternates] All modules loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.log('[CQE Alternates] Timeout waiting for modules. Proceeding with available modules.');
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
        console.log('BEDROCK_AGENT_INTEGRATION:', !!window.BEDROCK_AGENT_INTEGRATION);
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
