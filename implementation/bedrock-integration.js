// ==UserScript==
// @name         CQE Bedrock Integration Module
// @namespace    http://amazon.com/cqe
// @version      3.0
// @description  AWS Bedrock Agent integration for CQE Alternates Enhancement (Using Wrapper Functions)
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // AWS Bedrock Agent Runtime Integration System (Using Wrapper Functions)
    window.BEDROCK_AGENT_INTEGRATION = {
        // Configuration - Multi-Function Agent
        CONFIG: {
            region: 'us-west-2',
            agentId: 'CAP1I3RZLN',
            agentAliasId: 'HPTZBY3CYT',
            timeout: 30000, // 30 second timeout
            maxRetries: 3,
            retryDelay: 1000 // 1 second base delay
        },
        
        // Bundle integration
        bundleLoaded: false,
        client: null,
        currentSessionId: null,
        
        // Initialize using the wrapper functions with retry mechanism
        initializeBundle: function() {
            console.log('🔍 DEBUG: initializeBundle called (using wrapper functions with retry)');
            
            if (this.bundleLoaded && this.client) {
                console.log('🔍 DEBUG: Bundle already loaded and client created');
                return true;
            }
            
            try {
                // Check if wrapper functions are available
                console.log('🔍 DEBUG: Checking for wrapper functions...');
                console.log('🔍 DEBUG: typeof window.cqeBedrockCreateClient:', typeof window.cqeBedrockCreateClient);
                console.log('🔍 DEBUG: typeof window.cqeBedrockGenerateSessionId:', typeof window.cqeBedrockGenerateSessionId);
                console.log('🔍 DEBUG: typeof window.cqeBedrockCreateCredentials:', typeof window.cqeBedrockCreateCredentials);
                
                if (typeof window.cqeBedrockCreateClient === 'function' &&
                    typeof window.cqeBedrockGenerateSessionId === 'function' &&
                    typeof window.cqeBedrockCreateCredentials === 'function') {
                    
                    console.log('🔍 DEBUG: ✅ All wrapper functions are available');
                    this.bundleLoaded = true;
                    window.log('Bedrock Agent Runtime wrapper functions loaded successfully');
                    return true;
                } else {
                    console.log('🔍 DEBUG: ❌ Wrapper functions not available, checking alternatives...');
                    console.log('🔍 DEBUG: Available window functions:', Object.keys(window).filter(k => k.includes('cqeBedrock')));
                    
                    // Try to create wrapper functions directly if BedrockAgentRuntime is available
                    if (typeof BedrockAgentRuntime !== 'undefined' && BedrockAgentRuntime !== null) {
                        console.log('🔍 DEBUG: 🔧 BedrockAgentRuntime found directly, creating wrapper functions...');
                        
                        try {
                            // Create wrapper functions directly in this context
                            window.cqeBedrockCreateClient = function(config) {
                                console.log('🔍 DEBUG: 🔧 Direct wrapper: Creating Bedrock client');
                                return BedrockAgentRuntime.createClient(config);
                            };
                            
                            window.cqeBedrockGenerateSessionId = function() {
                                console.log('🔍 DEBUG: 🔧 Direct wrapper: Generating session ID');
                                if (BedrockAgentRuntime.utils && BedrockAgentRuntime.utils.generateSessionId) {
                                    return BedrockAgentRuntime.utils.generateSessionId();
                                } else {
                                    return 'cqe_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                                }
                            };
                            
                            window.cqeBedrockCreateCredentials = function(accessKeyId, secretAccessKey, sessionToken) {
                                console.log('🔍 DEBUG: 🔧 Direct wrapper: Creating credentials');
                                if (BedrockAgentRuntime.utils && BedrockAgentRuntime.utils.createCredentials) {
                                    return BedrockAgentRuntime.utils.createCredentials(accessKeyId, secretAccessKey, sessionToken);
                                } else {
                                    return { accessKeyId, secretAccessKey, sessionToken };
                                }
                            };
                            
                            console.log('🔍 DEBUG: ✅ Direct wrapper functions created successfully');
                            this.bundleLoaded = true;
                            window.log('Bedrock Agent Runtime direct wrapper functions created');
                            return true;
                            
                        } catch (wrapperError) {
                            console.log('🔍 DEBUG: ❌ Failed to create direct wrapper functions:', wrapperError);
                        }
                    }
                    
                    console.log('🔍 DEBUG: ❌ No wrapper functions available and cannot create them');
                    window.log('Bedrock wrapper functions not available');
                    return false;
                }
                
            } catch (error) {
                console.log('🔍 DEBUG: Failed to initialize wrapper functions:', error);
                window.log('Failed to initialize Bedrock wrapper functions:', error);
                return false;
            }
        },
        
        // Initialize Bedrock Agent Runtime client using wrapper functions
        initializeClient: function() {
            if (this.client) {
                return this.client;
            }
            
            const bundleReady = this.initializeBundle();
            if (!bundleReady) {
                throw new Error('Bedrock Agent Runtime wrapper functions not available');
            }
            
            try {
                console.log('🔍 DEBUG: Creating BedrockAgentRuntime client using wrapper functions...');
                
                // Get credentials from various sources
                const credentials = this.getBundleCredentials();
                
                // Create client using the wrapper function
                const clientConfig = {
                    region: this.CONFIG.region,
                    credentials: credentials
                };
                
                console.log('🔍 DEBUG: Client config (credentials hidden):', {
                    region: clientConfig.region,
                    hasCredentials: !!clientConfig.credentials
                });
                
                // Use the wrapper function to create the client
                this.client = window.cqeBedrockCreateClient(clientConfig);
                
                console.log('🔍 DEBUG: BedrockAgentRuntime client created successfully using wrapper functions');
                window.log('Bedrock Agent Runtime client initialized using wrapper functions');
                return this.client;
                
            } catch (error) {
                console.log('🔍 DEBUG: Failed to create BedrockAgentRuntime client:', error);
                window.log('Failed to initialize Bedrock client using wrapper functions:', error);
                throw new Error(`Failed to initialize Bedrock client: ${error.message}`);
            }
        },
        
        // Get credentials for the bundle using wrapper functions
        getBundleCredentials: function() {
            console.log('🔍 DEBUG: Attempting to get credentials for wrapper functions...');
            
            // Method 1: Try to get credentials from the credentials helper
            try {
                if (window.AWS_CREDENTIALS_HELPER && window.AWS_CREDENTIALS_HELPER.hasCredentials()) {
                    console.log('🔍 DEBUG: Found credentials in AWS_CREDENTIALS_HELPER');
                    const helperCredentials = window.AWS_CREDENTIALS_HELPER.createCredentialsProvider();
                    if (helperCredentials) {
                        console.log('🔍 DEBUG: Successfully got credentials from helper');
                        
                        // Use the wrapper function to create credentials
                        return window.cqeBedrockCreateCredentials(
                            helperCredentials.accessKeyId,
                            helperCredentials.secretAccessKey,
                            helperCredentials.sessionToken
                        );
                    }
                }
            } catch (error) {
                console.log('🔍 DEBUG: Failed to get credentials from helper:', error.message);
            }
            
            // Method 2: Provide helpful guidance if no credentials found
            console.log('🔍 DEBUG: No credentials found, returning null (client will need credentials)');
            console.log('💡 HINT: If you need to set credentials for testing, use:');
            console.log('   AWS_CREDENTIALS_HELPER.setupCredentialsInteractively()');
            console.log('   or AWS_CREDENTIALS_HELPER.setTemporaryCredentials(keyId, secret, token)');
            
            return null;
        },
        
        generateSessionId: function() {
            // Use the wrapper function if available
            if (typeof window.cqeBedrockGenerateSessionId === 'function') {
                console.log('🔍 DEBUG: Using wrapper function to generate session ID');
                return window.cqeBedrockGenerateSessionId();
            }
            
            // Fallback to manual generation
            console.log('🔍 DEBUG: Using fallback session ID generation');
            return 'cqe_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        getSessionId: function() {
            if (!this.currentSessionId) {
                this.currentSessionId = this.generateSessionId();
            }
            return this.currentSessionId;
        },
        
        resetSession: function() {
            this.currentSessionId = null;
        },
        
        // Perform the actual Bedrock Agent request using wrapper functions
        performRequest: async function(prompt, config) {
            console.log('🔍 DEBUG: performRequest called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: Using Bedrock Agent Runtime wrapper functions');
            
            try {
                console.log('🔍 DEBUG: Attempting to initialize client...');
                const client = this.initializeClient();
                const sessionId = this.getSessionId();
                
                console.log('🔍 DEBUG: Client initialized, invoking Bedrock Agent...');
                window.log('Invoking Bedrock Agent with wrapper functions, prompt:', prompt.substring(0, 100) + '...');
                
                // Use the client's invokeAgent method
                const requestParams = {
                    agentId: config.agentId,
                    agentAliasId: config.agentAliasId,
                    sessionId: sessionId,
                    inputText: prompt
                };
                
                console.log('🔍 DEBUG: Bedrock Agent request params:', {
                    agentId: config.agentId,
                    agentAliasId: config.agentAliasId,
                    sessionId: sessionId,
                    inputLength: prompt.length
                });
                
                // Make the actual Bedrock Agent call using the client
                console.log('🔍 DEBUG: Sending request to Bedrock Agent via wrapper functions...');
                const response = await client.invokeAgent(requestParams);
                
                console.log('🔍 DEBUG: Bedrock Agent response received:', response);
                
                if (!response || !response.completion) {
                    throw new Error('No completion in response');
                }
                
                // The bundle should handle the streaming response processing
                let completion = '';
                
                if (typeof response.completion === 'string') {
                    // If the bundle already processed the streaming response
                    completion = response.completion;
                    console.log('🔍 DEBUG: Bundle returned processed completion:', completion);
                } else {
                    // If we need to process the streaming response
                    console.log('🔍 DEBUG: Processing streaming response...');
                    
                    for await (const chunkEvent of response.completion) {
                        const chunk = chunkEvent.chunk;
                        if (chunk && chunk.bytes) {
                            console.log(`🔍 DEBUG: Received chunk (${chunk.bytes.length} bytes)`);
                            const decodedResponse = new TextDecoder('utf-8').decode(chunk.bytes);
                            completion += decodedResponse;
                            console.log(`🔍 DEBUG: Decoded chunk: "${decodedResponse.substring(0, 100)}${decodedResponse.length > 100 ? '...' : ''}"`);
                        }
                    }
                }
                
                console.log('🔍 DEBUG: Final completion:', completion);
                
                return {
                    success: true,
                    response: completion,
                    model: 'bedrock-agent-wrapper',
                    requestId: sessionId,
                    usage: {
                        promptTokens: Math.floor(prompt.length / 4),
                        completionTokens: Math.floor(completion.length / 4),
                        totalTokens: Math.floor(prompt.length / 4) + Math.floor(completion.length / 4)
                    }
                };
                
            } catch (error) {
                console.log('🔍 DEBUG: Error in performRequest:', error);
                console.log('🔍 DEBUG: Error message:', error.message);
                console.log('🔍 DEBUG: Error stack:', error.stack);
                
                window.log('Bedrock Agent wrapper request error:', error);
                
                // Check for authentication errors
                if (error.message.includes('credentials') || 
                    error.message.includes('authentication') || 
                    error.message.includes('unauthorized') ||
                    error.message.includes('ExpiredToken') ||
                    error.name === 'ExpiredTokenException' ||
                    error.name === 'AccessDeniedException') {
                    throw new Error('Authentication failed: Please ensure you have valid AWS credentials configured.');
                }
                
                throw error;
            }
        },
        
        // Make LLM request with retry logic (using wrapper functions)
        makeRequest: async function(prompt, options = {}) {
            console.log('🔍 DEBUG: makeRequest called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: makeRequest options:', options);
            
            const config = { ...this.CONFIG, ...options };
            let lastError = null;
            
            for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
                try {
                    console.log(`🔍 DEBUG: Bedrock Agent wrapper attempt ${attempt}/${config.maxRetries}`);
                    window.log(`Bedrock Agent wrapper attempt ${attempt}/${config.maxRetries}`);
                    
                    console.log('🔍 DEBUG: About to call this.performRequest...');
                    const response = await this.performRequest(prompt, config);
                    console.log('🔍 DEBUG: performRequest returned:', response);
                    
                    if (response.success) {
                        window.log('Bedrock Agent wrapper request successful');
                        return response;
                    } else {
                        throw new Error(response.error || 'Unknown API error');
                    }
                    
                } catch (error) {
                    lastError = error;
                    window.log(`Bedrock API wrapper attempt ${attempt} failed:`, error.message);
                    
                    // Check for authentication errors - don't retry these
                    if (error.message.includes('Authentication failed') || 
                        error.message.includes('credentials') || 
                        error.message.includes('unauthorized') || 
                        error.message.includes('ExpiredToken') ||
                        error.status === 401 || 
                        error.status === 403) {
                        window.log('Authentication error detected, notifying user');
                        return {
                            success: false,
                            error: 'Authentication failed',
                            response: 'I\'m having trouble authenticating with the AI service. Please ensure you have valid AWS credentials configured.',
                            authError: true
                        };
                    }
                    
                    // Wait before retry (exponential backoff)
                    if (attempt < config.maxRetries) {
                        const delay = config.retryDelay * Math.pow(2, attempt - 1);
                        await this.sleep(delay);
                    }
                }
            }
            
            // All retries failed
            window.log('All Bedrock Agent wrapper attempts failed:', lastError);
            return {
                success: false,
                error: lastError.message || 'Bedrock Agent service unavailable',
                response: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again in a moment.'
            };
        },
        
        // Utility function for delays
        sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };
    
    // Multi-Function Agent Integration Functions (Updated for Wrapper Functions)
    
    // Generate search term using the multi-function agent
    window.generateSearchTermWithAgent = async function(formData) {
        console.log('🔍 generateSearchTermWithAgent called with:', formData);
        window.log('Generating search term with multi-function agent (wrapper functions)');
        
        // Prepare the JSON input for search term generation
        const agentInput = {
            function: "search_term_generation",
            original_product: formData.originalProduct || '',
            description: formData.itemDescription || '',
            must_have_attributes: Array.isArray(formData.mustHaveAttributes) ? 
                formData.mustHaveAttributes.filter(attr => attr.trim()) : 
                (formData.mustHaveAttributes || '').split(',').map(s => s.trim()).filter(s => s),
            nice_to_have_attributes: Array.isArray(formData.preferredAttributes) ? 
                formData.preferredAttributes.filter(attr => attr.trim()) : 
                (formData.preferredAttributes || '').split(',').map(s => s.trim()).filter(s => s)
        };
        
        const jsonInput = JSON.stringify(agentInput, null, 2);
        console.log('📤 RAW INPUT TO AGENT (Search Term Generation):', jsonInput);
        
        try {
            const response = await window.BEDROCK_AGENT_INTEGRATION.makeRequest(jsonInput);
            
            if (response.success) {
                console.log('📥 RAW OUTPUT FROM AGENT (Search Term Generation):', response.response);
                
                try {
                    const parsed = JSON.parse(response.response);
                    
                    if (parsed.function_executed === 'search_term_generation' && parsed.search_term) {
                        console.log('🎯 EXTRACTED SEARCH TERM:', `"${parsed.search_term}"`);
                        window.log('Search term generated successfully (wrapper functions):', parsed.search_term);
                        
                        return {
                            success: true,
                            searchTerm: parsed.search_term,
                            fullResponse: parsed,
                            rawResponse: response.response
                        };
                    } else {
                        throw new Error('Invalid response format or missing search_term field');
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse agent response:', parseError);
                    window.log('Error parsing search term response (wrapper functions):', parseError.message);
                    
                    return {
                        success: false,
                        error: 'Invalid JSON response from agent',
                        rawResponse: response.response
                    };
                }
            } else {
                console.error('❌ Agent request failed:', response.error);
                return {
                    success: false,
                    error: response.error,
                    rawResponse: response.response
                };
            }
        } catch (error) {
            console.error('❌ Error in generateSearchTermWithAgent:', error);
            window.log('Error generating search term (wrapper functions):', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    // Generate supplier summary using the multi-function agent
    window.generateSupplierSummaryWithAgent = async function(formData) {
        console.log('📋 generateSupplierSummaryWithAgent called with:', formData);
        window.log('Generating supplier summary with multi-function agent (wrapper functions)');
        
        // Prepare the JSON input for supplier summary generation
        const agentInput = {
            function: "supplier_summary",
            customer_usage_intent: formData.customerUsageIntent || '',
            original_product: formData.originalProduct || '',
            item_description: formData.itemDescription || '',
            description: formData.itemDescription || '', // Fallback field
            must_have_attributes: Array.isArray(formData.mustHaveAttributes) ? 
                formData.mustHaveAttributes.filter(attr => attr.trim()) : 
                (formData.mustHaveAttributes || '').split(',').map(s => s.trim()).filter(s => s),
            nice_to_have_attributes: Array.isArray(formData.preferredAttributes) ? 
                formData.preferredAttributes.filter(attr => attr.trim()) : 
                (formData.preferredAttributes || '').split(',').map(s => s.trim()).filter(s => s)
        };
        
        const jsonInput = JSON.stringify(agentInput, null, 2);
        console.log('📤 RAW INPUT TO AGENT (Supplier Summary):', jsonInput);
        
        try {
            const response = await window.BEDROCK_AGENT_INTEGRATION.makeRequest(jsonInput);
            
            if (response.success) {
                console.log('📥 RAW OUTPUT FROM AGENT (Supplier Summary):', response.response);
                
                try {
                    const parsed = JSON.parse(response.response);
                    
                    if (parsed.function_executed === 'supplier_summary' && parsed.summary) {
                        console.log('📄 EXTRACTED SUMMARY:');
                        console.log('────────────────────────────────────────');
                        console.log(parsed.summary);
                        console.log('────────────────────────────────────────');
                        
                        window.log('Supplier summary generated successfully (wrapper functions)');
                        
                        return {
                            success: true,
                            summary: parsed.summary,
                            fullResponse: parsed,
                            rawResponse: response.response
                        };
                    } else {
                        throw new Error('Invalid response format or missing summary field');
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse agent response:', parseError);
                    window.log('Error parsing supplier summary response (wrapper functions):', parseError.message);
                    
                    return {
                        success: false,
                        error: 'Invalid JSON response from agent',
                        rawResponse: response.response
                    };
                }
            } else {
                console.error('❌ Agent request failed:', response.error);
                return {
                    success: false,
                    error: response.error,
                    rawResponse: response.response
                };
            }
        } catch (error) {
            console.error('❌ Error in generateSupplierSummaryWithAgent:', error);
            window.log('Error generating supplier summary (wrapper functions):', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    window.log('Bedrock Integration module loaded with wrapper function support');
})();
