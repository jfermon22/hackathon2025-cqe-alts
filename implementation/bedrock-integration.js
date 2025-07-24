// ==UserScript==
// @name         CQE Bedrock Integration Module
// @namespace    http://amazon.com/cqe
// @version      2.0
// @description  AWS Bedrock Agent integration for CQE Alternates Enhancement (Browser-Compatible SDK v3)
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // AWS Bedrock Agent Runtime Integration System (Browser-Compatible)
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
        
        // SDK v3 modules and client management
        sdkLoaded: false,
        BedrockAgentRuntimeClient: null,
        InvokeAgentCommand: null,
        client: null,
        currentSessionId: null,
        
        // Initialize AWS SDK v3 using browser-compatible approach
        initializeSDK: async function() {
            console.log('🔍 DEBUG: initializeSDK v3 called');
            
            if (this.sdkLoaded && this.BedrockAgentRuntimeClient && this.InvokeAgentCommand) {
                console.log('🔍 DEBUG: SDK v3 already loaded, returning true');
                return true;
            }
            
            try {
                console.log('🔍 DEBUG: Loading AWS SDK v3 modules...');
                window.log('Loading AWS SDK v3...');
                
                // Try multiple CDN sources for AWS SDK v3
                const cdnSources = [
                    'https://cdn.skypack.dev/@aws-sdk/client-bedrock-agent-runtime@3',
                    'https://unpkg.com/@aws-sdk/client-bedrock-agent-runtime@latest/dist-es/index.js',
                    'https://esm.sh/@aws-sdk/client-bedrock-agent-runtime@3'
                ];
                
                let sdkModule = null;
                let lastError = null;
                
                for (const cdnUrl of cdnSources) {
                    try {
                        console.log(`🔍 DEBUG: Trying CDN: ${cdnUrl}`);
                        sdkModule = await import(cdnUrl);
                        console.log('🔍 DEBUG: Successfully loaded SDK from:', cdnUrl);
                        break;
                    } catch (error) {
                        console.log(`🔍 DEBUG: Failed to load from ${cdnUrl}:`, error);
                        lastError = error;
                        continue;
                    }
                }
                
                if (!sdkModule) {
                    throw new Error(`Failed to load AWS SDK v3 from any CDN. Last error: ${lastError?.message}`);
                }
                
                // Extract the required classes
                this.BedrockAgentRuntimeClient = sdkModule.BedrockAgentRuntimeClient;
                this.InvokeAgentCommand = sdkModule.InvokeAgentCommand;
                
                if (!this.BedrockAgentRuntimeClient || !this.InvokeAgentCommand) {
                    throw new Error('Required AWS SDK v3 classes not found in module');
                }
                
                this.sdkLoaded = true;
                console.log('🔍 DEBUG: AWS SDK v3 loaded and configured successfully');
                window.log('AWS SDK v3 loaded successfully');
                return true;
                
            } catch (error) {
                console.log('🔍 DEBUG: Failed to load AWS SDK v3:', error);
                window.log('Failed to load AWS SDK v3:', error);
                return false;
            }
        },
        
        // Initialize Bedrock Agent Runtime client
        initializeClient: async function() {
            if (this.client) {
                return this.client;
            }
            
            const sdkReady = await this.initializeSDK();
            if (!sdkReady) {
                throw new Error('AWS SDK v3 not available');
            }
            
            try {
                console.log('🔍 DEBUG: Creating BedrockAgentRuntimeClient with browser-compatible config...');
                
                // Try to get browser credentials from various sources
                const credentials = await this.getBrowserCredentials();
                
                // Browser-compatible client configuration
                const clientConfig = {
                    region: this.CONFIG.region,
                    credentials: credentials,
                    maxAttempts: 3,
                    requestHandler: undefined // Use default browser request handler
                };
                
                console.log('🔍 DEBUG: Client config (credentials hidden):', {
                    region: clientConfig.region,
                    hasCredentials: !!clientConfig.credentials,
                    maxAttempts: clientConfig.maxAttempts
                });
                
                // Create Bedrock Agent Runtime client with browser-compatible approach
                this.client = new this.BedrockAgentRuntimeClient(clientConfig);
                
                console.log('🔍 DEBUG: BedrockAgentRuntimeClient created successfully');
                window.log('Bedrock Agent Runtime client v3 initialized');
                return this.client;
                
            } catch (error) {
                console.log('🔍 DEBUG: Failed to create BedrockAgentRuntimeClient:', error);
                window.log('Failed to initialize Bedrock client v3:', error);
                
                // Try alternative initialization approaches
                const fallbackApproaches = [
                    // Approach 1: Minimal config with no credentials (let AWS SDK handle)
                    () => new this.BedrockAgentRuntimeClient({
                        region: this.CONFIG.region
                    }),
                    
                    // Approach 2: Try with empty credentials object
                    () => new this.BedrockAgentRuntimeClient({
                        region: this.CONFIG.region,
                        credentials: {}
                    }),
                    
                    // Approach 3: Try with fromEnv credentials provider
                    async () => {
                        const { fromEnv } = await import('@aws-sdk/credential-providers');
                        return new this.BedrockAgentRuntimeClient({
                            region: this.CONFIG.region,
                            credentials: fromEnv()
                        });
                    }
                ];
                
                for (let i = 0; i < fallbackApproaches.length; i++) {
                    try {
                        console.log(`🔍 DEBUG: Trying fallback approach ${i + 1}...`);
                        this.client = await fallbackApproaches[i]();
                        console.log(`🔍 DEBUG: Fallback approach ${i + 1} successful`);
                        window.log(`Bedrock Agent Runtime client v3 initialized (fallback approach ${i + 1})`);
                        return this.client;
                    } catch (fallbackError) {
                        console.log(`🔍 DEBUG: Fallback approach ${i + 1} failed:`, fallbackError.message);
                        continue;
                    }
                }
                
                throw new Error(`Failed to initialize Bedrock client: ${error.message}. All fallback approaches also failed.`);
            }
        },
        
        // Get browser credentials from various sources
        getBrowserCredentials: async function() {
            console.log('🔍 DEBUG: Attempting to get browser credentials...');
            
            // Method 1: Try to get credentials from the credentials helper
            try {
                if (window.AWS_CREDENTIALS_HELPER && window.AWS_CREDENTIALS_HELPER.hasCredentials()) {
                    console.log('🔍 DEBUG: Found credentials in AWS_CREDENTIALS_HELPER');
                    const helperCredentials = window.AWS_CREDENTIALS_HELPER.createCredentialsProvider();
                    if (helperCredentials) {
                        console.log('🔍 DEBUG: Successfully got credentials from helper');
                        return helperCredentials;
                    }
                }
            } catch (error) {
                console.log('🔍 DEBUG: Failed to get credentials from helper:', error.message);
            }
            
            // Method 2: Try to get credentials from AWS Console session (if user is logged in)
            try {
                // Check if we're in AWS Console context
                if (window.location && window.location.hostname && window.location.hostname.includes('console.aws.amazon.com')) {
                    console.log('🔍 DEBUG: Detected AWS Console context, trying to extract session credentials...');
                    
                    // Try to extract credentials from AWS Console session
                    const sessionCredentials = await this.extractAWSConsoleCredentials();
                    if (sessionCredentials) {
                        console.log('🔍 DEBUG: Successfully extracted AWS Console credentials');
                        return sessionCredentials;
                    }
                }
            } catch (error) {
                console.log('🔍 DEBUG: Failed to get AWS Console credentials:', error.message);
            }
            
            // Method 3: Try environment-based credentials (for development)
            try {
                console.log('🔍 DEBUG: Trying environment-based credentials...');
                const { fromEnv } = await import('@aws-sdk/credential-providers');
                const envCredentials = fromEnv();
                console.log('🔍 DEBUG: Environment credentials provider created');
                return envCredentials;
            } catch (error) {
                console.log('🔍 DEBUG: Failed to get environment credentials:', error.message);
            }
            
            // Method 4: Try to use browser's default credential chain
            try {
                console.log('🔍 DEBUG: Trying browser default credential chain...');
                const { defaultProvider } = await import('@aws-sdk/credential-providers');
                const defaultCredentials = defaultProvider();
                console.log('🔍 DEBUG: Default credential provider created');
                return defaultCredentials;
            } catch (error) {
                console.log('🔍 DEBUG: Failed to get default credentials:', error.message);
            }
            
            // Method 5: Provide helpful guidance if no credentials found
            console.log('🔍 DEBUG: No credentials found, returning undefined (will use SDK defaults)');
            console.log('💡 HINT: If you need to set credentials for testing, use:');
            console.log('   AWS_CREDENTIALS_HELPER.setupCredentialsInteractively()');
            console.log('   or AWS_CREDENTIALS_HELPER.setTemporaryCredentials(keyId, secret, token)');
            
            return undefined;
        },
        
        // Extract credentials from AWS Console session (if available)
        extractAWSConsoleCredentials: async function() {
            try {
                // This is a placeholder for AWS Console credential extraction
                // In a real implementation, this would extract session tokens from the AWS Console
                console.log('🔍 DEBUG: AWS Console credential extraction not implemented yet');
                return null;
            } catch (error) {
                console.log('🔍 DEBUG: Error extracting AWS Console credentials:', error);
                return null;
            }
        },
        
        generateSessionId: function() {
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
        
        // Perform the actual Bedrock Agent request (matches POC implementation)
        performRequest: async function(prompt, config) {
            console.log('🔍 DEBUG: performRequest v3 called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: Using AWS SDK v3 Bedrock Agent implementation');
            
            try {
                console.log('🔍 DEBUG: Attempting to initialize client v3...');
                const client = await this.initializeClient();
                const sessionId = this.getSessionId();
                
                console.log('🔍 DEBUG: Client v3 initialized, invoking Bedrock Agent...');
                window.log('Invoking Bedrock Agent v3 with prompt:', prompt.substring(0, 100) + '...');
                
                // Create command exactly like the POC
                const command = new this.InvokeAgentCommand({
                    agentId: config.agentId,
                    agentAliasId: config.agentAliasId,
                    sessionId: sessionId,
                    inputText: prompt
                });
                
                console.log('🔍 DEBUG: Bedrock Agent v3 command created:', {
                    agentId: config.agentId,
                    agentAliasId: config.agentAliasId,
                    sessionId: sessionId,
                    inputLength: prompt.length
                });
                
                // Make the actual Bedrock Agent call
                console.log('🔍 DEBUG: Sending command to Bedrock Agent v3...');
                const response = await client.send(command);
                
                console.log('🔍 DEBUG: Bedrock Agent v3 response received:', response);
                
                if (!response.completion) {
                    throw new Error('No completion in response');
                }
                
                // Process streaming response exactly like the POC
                console.log('🔍 DEBUG: Processing streaming response...');
                let completion = '';
                
                for await (const chunkEvent of response.completion) {
                    const chunk = chunkEvent.chunk;
                    if (chunk && chunk.bytes) {
                        console.log(`🔍 DEBUG: Received chunk (${chunk.bytes.length} bytes)`);
                        const decodedResponse = new TextDecoder('utf-8').decode(chunk.bytes);
                        completion += decodedResponse;
                        console.log(`🔍 DEBUG: Decoded chunk: "${decodedResponse.substring(0, 100)}${decodedResponse.length > 100 ? '...' : ''}"`);
                    }
                }
                
                console.log('🔍 DEBUG: Final completion v3:', completion);
                
                return {
                    success: true,
                    response: completion,
                    model: 'bedrock-agent-v3',
                    requestId: sessionId,
                    usage: {
                        promptTokens: Math.floor(prompt.length / 4),
                        completionTokens: Math.floor(completion.length / 4),
                        totalTokens: Math.floor(prompt.length / 4) + Math.floor(completion.length / 4)
                    }
                };
                
            } catch (error) {
                console.log('🔍 DEBUG: Error in performRequest v3:', error);
                console.log('🔍 DEBUG: Error message:', error.message);
                console.log('🔍 DEBUG: Error stack:', error.stack);
                
                window.log('Bedrock Agent v3 request error:', error);
                
                // Check for authentication errors
                if (error.message.includes('credentials') || 
                    error.message.includes('authentication') || 
                    error.message.includes('unauthorized') ||
                    error.message.includes('ExpiredToken') ||
                    error.name === 'ExpiredTokenException' ||
                    error.name === 'AccessDeniedException') {
                    throw new Error('Authentication failed: Please ensure you\'re logged in to AWS and have valid credentials.');
                }
                
                throw error;
            }
        },
        
        // Make LLM request with retry logic (updated for v3)
        makeRequest: async function(prompt, options = {}) {
            console.log('🔍 DEBUG: makeRequest v3 called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: makeRequest v3 options:', options);
            
            const config = { ...this.CONFIG, ...options };
            let lastError = null;
            
            for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
                try {
                    console.log(`🔍 DEBUG: Bedrock Agent v3 attempt ${attempt}/${config.maxRetries}`);
                    window.log(`Bedrock Agent v3 attempt ${attempt}/${config.maxRetries}`);
                    
                    console.log('🔍 DEBUG: About to call this.performRequest v3...');
                    const response = await this.performRequest(prompt, config);
                    console.log('🔍 DEBUG: performRequest v3 returned:', response);
                    
                    if (response.success) {
                        window.log('Bedrock Agent v3 request successful');
                        return response;
                    } else {
                        throw new Error(response.error || 'Unknown API error');
                    }
                    
                } catch (error) {
                    lastError = error;
                    window.log(`Bedrock API v3 attempt ${attempt} failed:`, error.message);
                    
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
                            response: 'I\'m having trouble authenticating with the AI service. Please ensure you\'re logged in to AWS and have the necessary permissions.',
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
            window.log('All Bedrock Agent v3 attempts failed:', lastError);
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
    
    // Multi-Function Agent Integration Functions (Updated for v3)
    
    // Generate search term using the multi-function agent
    window.generateSearchTermWithAgent = async function(formData) {
        console.log('🔍 generateSearchTermWithAgent v3 called with:', formData);
        window.log('Generating search term with multi-function agent v3');
        
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
        console.log('📤 RAW INPUT TO AGENT v3 (Search Term Generation):', jsonInput);
        
        try {
            const response = await window.BEDROCK_AGENT_INTEGRATION.makeRequest(jsonInput);
            
            if (response.success) {
                console.log('📥 RAW OUTPUT FROM AGENT v3 (Search Term Generation):', response.response);
                
                try {
                    const parsed = JSON.parse(response.response);
                    
                    if (parsed.function_executed === 'search_term_generation' && parsed.search_term) {
                        console.log('🎯 EXTRACTED SEARCH TERM v3:', `"${parsed.search_term}"`);
                        window.log('Search term generated successfully v3:', parsed.search_term);
                        
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
                    console.error('❌ Failed to parse agent v3 response:', parseError);
                    window.log('Error parsing search term response v3:', parseError.message);
                    
                    return {
                        success: false,
                        error: 'Invalid JSON response from agent',
                        rawResponse: response.response
                    };
                }
            } else {
                console.error('❌ Agent v3 request failed:', response.error);
                return {
                    success: false,
                    error: response.error,
                    rawResponse: response.response
                };
            }
        } catch (error) {
            console.error('❌ Error in generateSearchTermWithAgent v3:', error);
            window.log('Error generating search term v3:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    // Generate supplier summary using the multi-function agent
    window.generateSupplierSummaryWithAgent = async function(formData) {
        console.log('📋 generateSupplierSummaryWithAgent v3 called with:', formData);
        window.log('Generating supplier summary with multi-function agent v3');
        
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
        console.log('📤 RAW INPUT TO AGENT v3 (Supplier Summary):', jsonInput);
        
        try {
            const response = await window.BEDROCK_AGENT_INTEGRATION.makeRequest(jsonInput);
            
            if (response.success) {
                console.log('📥 RAW OUTPUT FROM AGENT v3 (Supplier Summary):', response.response);
                
                try {
                    const parsed = JSON.parse(response.response);
                    
                    if (parsed.function_executed === 'supplier_summary' && parsed.summary) {
                        console.log('📄 EXTRACTED SUMMARY v3:');
                        console.log('────────────────────────────────────────');
                        console.log(parsed.summary);
                        console.log('────────────────────────────────────────');
                        
                        window.log('Supplier summary generated successfully v3');
                        
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
                    console.error('❌ Failed to parse agent v3 response:', parseError);
                    window.log('Error parsing supplier summary response v3:', parseError.message);
                    
                    return {
                        success: false,
                        error: 'Invalid JSON response from agent',
                        rawResponse: response.response
                    };
                }
            } else {
                console.error('❌ Agent v3 request failed:', response.error);
                return {
                    success: false,
                    error: response.error,
                    rawResponse: response.response
                };
            }
        } catch (error) {
            console.error('❌ Error in generateSupplierSummaryWithAgent v3:', error);
            window.log('Error generating supplier summary v3:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    window.log('Bedrock Integration module v3 loaded with multi-function agent support');
})();
