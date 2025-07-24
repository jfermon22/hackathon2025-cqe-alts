// ==UserScript==
// @name         CQE Bedrock Integration Module
// @namespace    http://amazon.com/cqe
// @version      3.0
// @description  AWS Bedrock Agent integration for CQE Alternates Enhancement (Using Custom Bundle)
// @author       Amazon
// @grant        none
// @require      https://raw.githubusercontent.com/jfermon22/hackathon2025-cqe-alts/refs/heads/main/bedrock-userscript-bundle/dist/bedrock-agent-runtime.min.js
// ==/UserScript==

(function() {
    'use strict';
    
    // AWS Bedrock Agent Runtime Integration System (Using Custom Bundle)
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
        
        // Initialize using the custom bundle
        initializeBundle: function() {
            console.log('🔍 DEBUG: initializeBundle called');
            
            if (this.bundleLoaded && this.client) {
                console.log('🔍 DEBUG: Bundle already loaded and client created');
                return true;
            }
            
            try {
                // Check if BedrockAgentRuntime bundle is available
                if (typeof BedrockAgentRuntime === 'undefined') {
                    console.log('🔍 DEBUG: BedrockAgentRuntime bundle not found');
                    window.log('BedrockAgentRuntime bundle not available');
                    return false;
                }
                
                console.log('🔍 DEBUG: BedrockAgentRuntime bundle found:', typeof BedrockAgentRuntime);
                console.log('🔍 DEBUG: Available methods:', Object.keys(BedrockAgentRuntime));
                
                this.bundleLoaded = true;
                console.log('🔍 DEBUG: Bundle loaded successfully');
                window.log('Bedrock Agent Runtime bundle loaded successfully');
                return true;
                
            } catch (error) {
                console.log('🔍 DEBUG: Failed to initialize bundle:', error);
                window.log('Failed to initialize Bedrock bundle:', error);
                return false;
            }
        },
        
        // Initialize Bedrock Agent Runtime client using the bundle
        initializeClient: function() {
            if (this.client) {
                return this.client;
            }
            
            const bundleReady = this.initializeBundle();
            if (!bundleReady) {
                throw new Error('Bedrock Agent Runtime bundle not available');
            }
            
            try {
                console.log('🔍 DEBUG: Creating BedrockAgentRuntime client using bundle...');
                
                // Get credentials from various sources
                const credentials = this.getBundleCredentials();
                
                // Create client using the bundle's createClient method
                const clientConfig = {
                    region: this.CONFIG.region,
                    credentials: credentials
                };
                
                console.log('🔍 DEBUG: Client config (credentials hidden):', {
                    region: clientConfig.region,
                    hasCredentials: !!clientConfig.credentials
                });
                
                this.client = BedrockAgentRuntime.createClient(clientConfig);
                
                console.log('🔍 DEBUG: BedrockAgentRuntime client created successfully using bundle');
                window.log('Bedrock Agent Runtime client initialized using custom bundle');
                return this.client;
                
            } catch (error) {
                console.log('🔍 DEBUG: Failed to create BedrockAgentRuntime client:', error);
                window.log('Failed to initialize Bedrock client using bundle:', error);
                throw new Error(`Failed to initialize Bedrock client: ${error.message}`);
            }
        },
        
        // Get credentials for the bundle
        getBundleCredentials: function() {
            console.log('🔍 DEBUG: Attempting to get credentials for bundle...');
            
            // Method 1: Try to get credentials from the credentials helper
            try {
                if (window.AWS_CREDENTIALS_HELPER && window.AWS_CREDENTIALS_HELPER.hasCredentials()) {
                    console.log('🔍 DEBUG: Found credentials in AWS_CREDENTIALS_HELPER');
                    const helperCredentials = window.AWS_CREDENTIALS_HELPER.createCredentialsProvider();
                    if (helperCredentials) {
                        console.log('🔍 DEBUG: Successfully got credentials from helper');
                        
                        // Use the bundle's utility function to create credentials
                        return BedrockAgentRuntime.utils.createCredentials(
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
            // Use the bundle's utility function if available
            if (typeof BedrockAgentRuntime !== 'undefined' && BedrockAgentRuntime.utils && BedrockAgentRuntime.utils.generateSessionId) {
                return BedrockAgentRuntime.utils.generateSessionId();
            }
            
            // Fallback to manual generation
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
        
        // Perform the actual Bedrock Agent request using the bundle
        performRequest: async function(prompt, config) {
            console.log('🔍 DEBUG: performRequest called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: Using custom Bedrock Agent Runtime bundle');
            
            try {
                console.log('🔍 DEBUG: Attempting to initialize client...');
                const client = this.initializeClient();
                const sessionId = this.getSessionId();
                
                console.log('🔍 DEBUG: Client initialized, invoking Bedrock Agent...');
                window.log('Invoking Bedrock Agent with custom bundle, prompt:', prompt.substring(0, 100) + '...');
                
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
                
                // Make the actual Bedrock Agent call using the bundle
                console.log('🔍 DEBUG: Sending request to Bedrock Agent via bundle...');
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
                    model: 'bedrock-agent-bundle',
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
                
                window.log('Bedrock Agent bundle request error:', error);
                
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
        
        // Make LLM request with retry logic (using bundle)
        makeRequest: async function(prompt, options = {}) {
            console.log('🔍 DEBUG: makeRequest called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: makeRequest options:', options);
            
            const config = { ...this.CONFIG, ...options };
            let lastError = null;
            
            for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
                try {
                    console.log(`🔍 DEBUG: Bedrock Agent bundle attempt ${attempt}/${config.maxRetries}`);
                    window.log(`Bedrock Agent bundle attempt ${attempt}/${config.maxRetries}`);
                    
                    console.log('🔍 DEBUG: About to call this.performRequest...');
                    const response = await this.performRequest(prompt, config);
                    console.log('🔍 DEBUG: performRequest returned:', response);
                    
                    if (response.success) {
                        window.log('Bedrock Agent bundle request successful');
                        return response;
                    } else {
                        throw new Error(response.error || 'Unknown API error');
                    }
                    
                } catch (error) {
                    lastError = error;
                    window.log(`Bedrock API bundle attempt ${attempt} failed:`, error.message);
                    
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
            window.log('All Bedrock Agent bundle attempts failed:', lastError);
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
    
    // Multi-Function Agent Integration Functions (Updated for Bundle)
    
    // Generate search term using the multi-function agent
    window.generateSearchTermWithAgent = async function(formData) {
        console.log('🔍 generateSearchTermWithAgent called with:', formData);
        window.log('Generating search term with multi-function agent (bundle)');
        
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
                        window.log('Search term generated successfully (bundle):', parsed.search_term);
                        
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
                    window.log('Error parsing search term response (bundle):', parseError.message);
                    
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
            window.log('Error generating search term (bundle):', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    // Generate supplier summary using the multi-function agent
    window.generateSupplierSummaryWithAgent = async function(formData) {
        console.log('📋 generateSupplierSummaryWithAgent called with:', formData);
        window.log('Generating supplier summary with multi-function agent (bundle)');
        
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
                        
                        window.log('Supplier summary generated successfully (bundle)');
                        
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
                    window.log('Error parsing supplier summary response (bundle):', parseError.message);
                    
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
            window.log('Error generating supplier summary (bundle):', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    window.log('Bedrock Integration module loaded with custom bundle support');
})();
