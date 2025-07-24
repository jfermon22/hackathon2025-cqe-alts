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
            { url: baseUrl + 'aws-credentials-helper.js', name: 'aws-credentials-helper.js' },
            { url: baseUrl + 'bedrock-integration.js', name: 'bedrock-integration.js' },
            { url: baseUrl + 'ui-components.js', name: 'ui-components.js' },
            { url: baseUrl + 'main-initialization.js', name: 'main-initialization.js' }
        ];
        
        console.log('[CQE Alternates] Loading modules via GM_xmlhttpRequest from GitHub...');
        
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
                                
                                // More careful IIFE wrapper removal that preserves global assignments
                                const iifePattern = /^\s*\(function\(\)\s*\{\s*['"]use strict['"];\s*([\s\S]*)\s*\}\)\(\);\s*$/;
                                const match = moduleCode.match(iifePattern);
                                
                                if (match) {
                                    // Extract the inner code but be more careful about global assignments
                                    let innerCode = match[1];
                                    
                                    // For ui-components.js, let's be extra careful
                                    if (module.name === 'ui-components.js') {
                                        console.log('[CQE Alternates] 🔍 Processing ui-components.js for global functions');
                                        
                                        // Look for the global function assignments at the end
                                        const lines = innerCode.split('\n');
                                        let globalFunctionStart = -1;
                                        
                                        // Find where global functions start
                                        for (let i = lines.length - 1; i >= 0; i--) {
                                            if (lines[i].includes('window.cqeRemove') || lines[i].includes('// Global functions')) {
                                                globalFunctionStart = i;
                                                break;
                                            }
                                        }
                                        
                                        if (globalFunctionStart !== -1) {
                                            const mainCode = lines.slice(0, globalFunctionStart).join('\n');
                                            const globalCode = lines.slice(globalFunctionStart).join('\n');
                                            moduleCode = mainCode + '\n\n' + globalCode;
                                            console.log('[CQE Alternates] ✅ Preserved global functions for ui-components.js');
                                        } else {
                                            moduleCode = innerCode;
                                            console.log('[CQE Alternates] ⚠️ Could not find global functions in ui-components.js');
                                        }
                                    } else {
                                        // For other modules, use simpler approach
                                        moduleCode = innerCode;
                                    }
                                } else {
                                    console.log(`[CQE Alternates] ⚠️ No IIFE wrapper found in ${module.name}`);
                                }
                                
                                // Execute the code in global scope
                                eval(moduleCode);
                                
                                // Special check for UI Components global functions
                                if (module.name === 'ui-components.js') {
                                    console.log('[CQE Alternates] 🔍 Checking for UI global functions after execution...');
                                    console.log('[CQE Alternates] window.cqeRemoveManualASIN:', typeof window.cqeRemoveManualASIN);
                                    console.log('[CQE Alternates] window.cqeRemoveSelectedAlternate:', typeof window.cqeRemoveSelectedAlternate);
                                    
                                    if (!window.cqeRemoveManualASIN || !window.cqeRemoveSelectedAlternate) {
                                        console.error(`[CQE Alternates] ❌ Missing UI global functions! This will cause remove button errors.`);
                                        
                                        // Try to manually create them from the UI_COMPONENTS module
                                        if (window.UI_COMPONENTS) {
                                            console.log('[CQE Alternates] 🔧 Attempting to create global functions from UI_COMPONENTS...');
                                            
                                            window.cqeRemoveManualASIN = function(asin) {
                                                console.log('[CQE Alternates] Manual global function: Removing manual ASIN:', asin);
                                                if (window.UI_COMPONENTS && window.UI_COMPONENTS.manualAsins && window.UI_COMPONENTS.manualAsins.has(asin)) {
                                                    window.UI_COMPONENTS.manualAsins.delete(asin);
                                                    if (window.UI_COMPONENTS.initializeModalFunctionality) {
                                                        window.UI_COMPONENTS.initializeModalFunctionality();
                                                    }
                                                }
                                            };
                                            
                                            window.cqeRemoveSelectedAlternate = function(asin) {
                                                console.log('[CQE Alternates] Manual global function: Removing selected alternate:', asin);
                                                if (window.UI_COMPONENTS && window.UI_COMPONENTS.selectedAlternates && window.UI_COMPONENTS.selectedAlternates.has(asin)) {
                                                    window.UI_COMPONENTS.selectedAlternates.delete(asin);
                                                    if (window.UI_COMPONENTS.initializeModalFunctionality) {
                                                        window.UI_COMPONENTS.initializeModalFunctionality();
                                                    }
                                                }
                                            };
                                            
                                            console.log('[CQE Alternates] ✅ Manual global functions created');
                                        }
                                    } else {
                                        console.log('[CQE Alternates] ✅ UI global functions are available');
                                    }
                                }
                                
                                loadedCount++;
                                
                                // Special check for AWS credentials helper
                                if (module.name === 'aws-credentials-helper.js') {
                                    console.log('[CQE Alternates] 🔍 Checking AWS_CREDENTIALS_HELPER after execution...');
                                    console.log('[CQE Alternates] window.AWS_CREDENTIALS_HELPER:', typeof window.AWS_CREDENTIALS_HELPER);
                                    
                                    if (window.AWS_CREDENTIALS_HELPER) {
                                        console.log('[CQE Alternates] ✅ AWS_CREDENTIALS_HELPER loaded successfully');
                                        console.log('[CQE Alternates] Available methods:', Object.keys(window.AWS_CREDENTIALS_HELPER));
                                        
                                        // Inject AWS_CREDENTIALS_HELPER into the main page context
                                        const script = document.createElement('script');
                                        script.textContent = `
                                            window.AWS_CREDENTIALS_HELPER = {
                                                temporaryCredentials: null,
                                                
                                                setTemporaryCredentials: function(accessKeyId, secretAccessKey, sessionToken = null) {
                                                    console.log('🔐 Setting temporary AWS credentials for browser testing');
                                                    
                                                    this.temporaryCredentials = {
                                                        accessKeyId: accessKeyId,
                                                        secretAccessKey: secretAccessKey,
                                                        sessionToken: sessionToken
                                                    };
                                                    
                                                    console.log('✅ Temporary credentials set (expires when page reloads)');
                                                    console.warn('⚠️ SECURITY WARNING: These credentials are stored in memory only and will be lost when the page reloads. Do not use production credentials in browser environment.');
                                                    
                                                    return true;
                                                },
                                                
                                                getCredentials: function() {
                                                    if (this.temporaryCredentials) {
                                                        console.log('🔐 Returning stored temporary credentials');
                                                        return {
                                                            accessKeyId: this.temporaryCredentials.accessKeyId,
                                                            secretAccessKey: this.temporaryCredentials.secretAccessKey,
                                                            sessionToken: this.temporaryCredentials.sessionToken
                                                        };
                                                    }
                                                    
                                                    console.log('🔐 No temporary credentials stored');
                                                    return null;
                                                },
                                                
                                                clearCredentials: function() {
                                                    console.log('🔐 Clearing temporary credentials');
                                                    this.temporaryCredentials = null;
                                                    console.log('✅ Temporary credentials cleared');
                                                },
                                                
                                                hasCredentials: function() {
                                                    return !!this.temporaryCredentials;
                                                },
                                                
                                                setupCredentialsInteractively: function() {
                                                    console.log('🔐 Interactive credential setup');
                                                    
                                                    const accessKeyId = prompt('Enter AWS Access Key ID (for testing only):');
                                                    if (!accessKeyId) {
                                                        console.log('❌ Credential setup cancelled');
                                                        return false;
                                                    }
                                                    
                                                    const secretAccessKey = prompt('Enter AWS Secret Access Key (for testing only):');
                                                    if (!secretAccessKey) {
                                                        console.log('❌ Credential setup cancelled');
                                                        return false;
                                                    }
                                                    
                                                    const sessionToken = prompt('Enter AWS Session Token (optional, leave blank if not using):');
                                                    
                                                    return this.setTemporaryCredentials(accessKeyId, secretAccessKey, sessionToken || null);
                                                },
                                                
                                                createCredentialsProvider: function() {
                                                    if (!this.hasCredentials()) {
                                                        console.log('🔐 No credentials available for provider');
                                                        return null;
                                                    }
                                                    
                                                    const creds = this.getCredentials();
                                                    
                                                    return {
                                                        accessKeyId: creds.accessKeyId,
                                                        secretAccessKey: creds.secretAccessKey,
                                                        sessionToken: creds.sessionToken
                                                    };
                                                },
                                                
                                                showStatus: function() {
                                                    console.log('🔐 AWS Credentials Status:');
                                                    console.log('   Has Credentials: ' + this.hasCredentials());
                                                    
                                                    if (this.hasCredentials()) {
                                                        const creds = this.getCredentials();
                                                        console.log('   Access Key ID: ' + (creds.accessKeyId ? creds.accessKeyId.substring(0, 8) + '...' : 'Not set'));
                                                        console.log('   Secret Key: ' + (creds.secretAccessKey ? '***' + creds.secretAccessKey.substring(creds.secretAccessKey.length - 4) : 'Not set'));
                                                        console.log('   Session Token: ' + (creds.sessionToken ? 'Present' : 'Not set'));
                                                    }
                                                    
                                                    console.log('');
                                                    console.log('🔧 Available Methods:');
                                                    console.log('   AWS_CREDENTIALS_HELPER.setupCredentialsInteractively() - Interactive setup');
                                                    console.log('   AWS_CREDENTIALS_HELPER.setTemporaryCredentials(keyId, secret, token) - Manual setup');
                                                    console.log('   AWS_CREDENTIALS_HELPER.clearCredentials() - Clear credentials');
                                                    console.log('   AWS_CREDENTIALS_HELPER.showStatus() - Show this status');
                                                }
                                            };
                                            
                                            console.log('🔐 AWS_CREDENTIALS_HELPER injected into main page context');
                                            console.log('💡 Use AWS_CREDENTIALS_HELPER.showStatus() to see available options');
                                            console.log('💡 Use AWS_CREDENTIALS_HELPER.setupCredentialsInteractively() for quick setup');
                                        `;
                                        document.head.appendChild(script);
                                        document.head.removeChild(script);
                                        
                                        console.log('[CQE Alternates] 🌐 AWS_CREDENTIALS_HELPER injected into main page context');
                                    } else {
                                        console.error('[CQE Alternates] ❌ AWS_CREDENTIALS_HELPER not found after execution');
                                    }
                                }
                                
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
            const maxAttempts = 20; // Reduced to 2 seconds max wait
            
            const checkModules = () => {
                attempts++;
                
                // Check which modules are available
                const moduleStatus = {
                    CQE_SELECTORS: !!window.CQE_SELECTORS,
                    ASIN_VALIDATION: !!window.ASIN_VALIDATION,
                    MODAL_SYSTEM: !!window.MODAL_SYSTEM,
                    AMAZON_SEARCH_MODULE: !!window.AMAZON_SEARCH_MODULE,
                    AWS_CREDENTIALS_HELPER: !!window.AWS_CREDENTIALS_HELPER,
                    BEDROCK_AGENT_INTEGRATION: !!window.BEDROCK_AGENT_INTEGRATION,
                    UI_COMPONENTS: !!window.UI_COMPONENTS,
                    CQE_MAIN: !!window.CQE_MAIN
                };
                
                const loadedCount = Object.values(moduleStatus).filter(Boolean).length;
                const totalModules = Object.keys(moduleStatus).length;
                
                if (loadedCount === totalModules) {
                    console.log('[CQE Alternates] All modules loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.log(`[CQE Alternates] Module wait timeout. ${loadedCount}/${totalModules} modules available. Proceeding...`);
                    console.log('[CQE Alternates] Module status:', moduleStatus);
                    resolve();
                } else {
                    // Only log every 5 attempts to reduce noise
                    if (attempts % 5 === 0) {
                        console.log(`[CQE Alternates] Waiting for modules... ${loadedCount}/${totalModules} loaded`);
                    }
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
            
            // Ensure critical UI functions are available as fallback
            if (!window.cqeRemoveManualASIN || !window.cqeRemoveSelectedAlternate) {
                console.log('[CQE Alternates] 🔧 Adding fallback UI functions...');
                
                window.cqeRemoveManualASIN = function(asin) {
                    console.log('[CQE Alternates] Fallback: Removing manual ASIN:', asin);
                    if (window.UI_COMPONENTS && window.UI_COMPONENTS.manualAsins && window.UI_COMPONENTS.manualAsins.has(asin)) {
                        window.UI_COMPONENTS.manualAsins.delete(asin);
                        // Re-initialize to update display
                        if (window.UI_COMPONENTS.initializeModalFunctionality) {
                            window.UI_COMPONENTS.initializeModalFunctionality();
                        }
                        console.log('[CQE Alternates] Fallback: Manual ASIN removed:', asin);
                    }
                };
                
                window.cqeRemoveSelectedAlternate = function(asin) {
                    console.log('[CQE Alternates] Fallback: Removing selected alternate:', asin);
                    if (window.UI_COMPONENTS && window.UI_COMPONENTS.selectedAlternates && window.UI_COMPONENTS.selectedAlternates.has(asin)) {
                        window.UI_COMPONENTS.selectedAlternates.delete(asin);
                        // Re-initialize to update display
                        if (window.UI_COMPONENTS.initializeModalFunctionality) {
                            window.UI_COMPONENTS.initializeModalFunctionality();
                        }
                        console.log('[CQE Alternates] Fallback: Selected alternate removed:', asin);
                    }
                };
                
                console.log('[CQE Alternates] ✅ Fallback UI functions added');
            }
            
            
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
