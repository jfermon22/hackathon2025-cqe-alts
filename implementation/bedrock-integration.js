// ==UserScript==
// @name         CQE Bedrock Integration Module
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  AWS Bedrock Agent integration for CQE Alternates Enhancement
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // AWS Bedrock Agent Runtime Integration System
    window.BEDROCK_AGENT_INTEGRATION = {
        // Configuration
        CONFIG: {
            region: 'us-west-2',
            agentId: 'CAP1I3RZLN',
            agentAliasId: 'CAP1I3RZLN', // Using same ID as provided
            timeout: 30000, // 30 second timeout
            maxRetries: 3,
            retryDelay: 1000 // 1 second base delay
        },
        
        // Authentication and headers
        getHeaders: function() {
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`,
                'X-Amzn-RequestId': this.generateRequestId(),
                'User-Agent': 'CQE-Alternates-Enhancement/1.0'
            };
        },
        
        // Get authentication token (placeholder - would integrate with actual auth)
        getAuthToken: function() {
            // In a real implementation, this would get the token from:
            // - Midway authentication
            // - Internal service credentials
            // - Browser session tokens
            return 'placeholder_auth_token';
        },
        
        // Generate unique request ID for tracking
        generateRequestId: function() {
            return 'cqe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        // Make LLM request with retry logic
        makeRequest: async function(prompt, options = {}) {
            console.log('🔍 DEBUG: makeRequest called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: makeRequest options:', options);
            
            const config = { ...this.CONFIG, ...options };
            let lastError = null;
            
            for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
                try {
                    console.log(`🔍 DEBUG: Bedrock Agent attempt ${attempt}/${config.maxRetries}`);
                    window.log(`Bedrock Agent attempt ${attempt}/${config.maxRetries}`);
                    
                    console.log('🔍 DEBUG: About to call this.performRequest...');
                    const response = await this.performRequest(prompt, config);
                    console.log('🔍 DEBUG: performRequest returned:', response);
                    
                    if (response.success) {
                        window.log('Bedrock Agent request successful');
                        return response;
                    } else {
                        throw new Error(response.error || 'Unknown API error');
                    }
                    
                } catch (error) {
                    lastError = error;
                    window.log(`Bedrock API attempt ${attempt} failed:`, error.message);
                    
                    // Check for authentication errors - don't retry these
                    if (error.message.includes('Authentication failed') || error.message.includes('credentials') || error.message.includes('unauthorized') || error.status === 401 || error.status === 403) {
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
            window.log('All Bedrock Agent attempts failed:', lastError);
            return {
                success: false,
                error: lastError.message || 'Bedrock Agent service unavailable',
                response: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again in a moment.'
            };
        },
        
        // AWS SDK and client management
        sdkLoaded: false,
        client: null,
        currentSessionId: null,
        
        // Initialize AWS SDK
        initializeSDK: async function() {
            console.log('🔍 DEBUG: initializeSDK called');
            console.log('🔍 DEBUG: sdkLoaded:', this.sdkLoaded, 'window.AWS:', !!window.AWS);
            
            if (this.sdkLoaded && window.AWS) {
                console.log('🔍 DEBUG: SDK already loaded, returning true');
                return true;
            }
            
            try {
                console.log('🔍 DEBUG: Loading AWS SDK from CDN...');
                window.log('Loading AWS SDK...');
                
                // Load AWS SDK from CDN
                const script = document.createElement('script');
                script.src = 'https://sdk.amazonaws.com/js/aws-sdk-2.x.x.min.js';
                script.async = true;
                
                await new Promise((resolve, reject) => {
                    script.onload = () => {
                        console.log('🔍 DEBUG: AWS SDK script loaded successfully');
                        resolve();
                    };
                    script.onerror = (error) => {
                        console.log('🔍 DEBUG: AWS SDK script failed to load:', error);
                        reject(error);
                    };
                    document.head.appendChild(script);
                });
                
                console.log('🔍 DEBUG: Checking if window.AWS is available:', !!window.AWS);
                
                if (!window.AWS) {
                    throw new Error('AWS SDK failed to load');
                }
                
                console.log('🔍 DEBUG: Configuring AWS...');
                
                // Configure AWS with STS tokens
                window.AWS.config.update({
                    region: this.CONFIG.region
                });
                
                this.sdkLoaded = true;
                console.log('🔍 DEBUG: AWS SDK loaded and configured successfully');
                window.log('AWS SDK loaded successfully');
                return true;
                
            } catch (error) {
                console.log('🔍 DEBUG: Failed to load AWS SDK:', error);
                window.log('Failed to load AWS SDK:', error);
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
                throw new Error('AWS SDK not available');
            }
            
            try {
                // Create Bedrock Agent Runtime client
                this.client = new window.AWS.BedrockAgentRuntime({
                    region: this.CONFIG.region
                });
                
                window.log('Bedrock Agent Runtime client initialized');
                return this.client;
                
            } catch (error) {
                window.log('Failed to initialize Bedrock client:', error);
                throw error;
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
        
        // Perform the actual Bedrock Agent request
        performRequest: async function(prompt, config) {
            console.log('🔍 DEBUG: performRequest called with prompt:', prompt.substring(0, 50) + '...');
            console.log('🔍 DEBUG: Using real Bedrock Agent implementation');
            
            try {
                console.log('🔍 DEBUG: Attempting to initialize client...');
                const client = await this.initializeClient();
                const sessionId = this.getSessionId();
                
                console.log('🔍 DEBUG: Client initialized, invoking Bedrock Agent...');
                window.log('Invoking Bedrock Agent with prompt:', prompt.substring(0, 100) + '...');
                
                const params = {
                    agentId: config.agentId,
                    agentAliasId: config.agentAliasId,
                    sessionId: sessionId,
                    inputText: prompt
                };
                
                console.log('🔍 DEBUG: Bedrock Agent params:', params);
                
                // Make the actual Bedrock Agent call
                const response = await client.invokeAgent(params).promise();
                
                console.log('🔍 DEBUG: Bedrock Agent response received:', response);
                
                if (!response.completion) {
                    throw new Error('No completion in response');
                }
                
                // Process streaming response
                let completion = '';
                for await (const chunkEvent of response.completion) {
                    const chunk = chunkEvent.chunk;
                    if (chunk && chunk.bytes) {
                        const decodedResponse = new TextDecoder('utf-8').decode(chunk.bytes);
                        completion += decodedResponse;
                    }
                }
                
                console.log('🔍 DEBUG: Final completion:', completion);
                
                return {
                    success: true,
                    response: completion,
                    model: 'bedrock-agent',
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
                
                window.log('Bedrock Agent request error:', error);
                
                // Check for authentication errors
                if (error.message.includes('credentials') || error.message.includes('authentication') || error.message.includes('unauthorized')) {
                    throw new Error('Authentication failed: Please ensure you\'re logged in to AWS and have the necessary permissions.');
                }
                
                throw error;
            }
        },
        
        // Generate simulated LLM response for testing
        generateSimulatedResponse: function(prompt) {
            // Analyze prompt to generate appropriate response
            const promptLower = prompt.toLowerCase();
            
            if (promptLower.includes('requirements') && promptLower.includes('extract')) {
                return JSON.stringify({
                    specifications: ['durable', 'waterproof', 'portable'],
                    price_constraints: { max_price: 50 },
                    use_case: 'outdoor activities',
                    brand_preferences: ['3M', 'Sony'],
                    must_have_features: ['wireless', 'long battery life'],
                    nice_to_have_features: ['compact design']
                });
            }
            
            if (promptLower.includes('search terms') && promptLower.includes('generate')) {
                return JSON.stringify([
                    'waterproof wireless headphones',
                    'durable outdoor electronics',
                    'portable audio device',
                    'sports headphones wireless',
                    'rugged bluetooth earbuds'
                ]);
            }
            
            if (promptLower.includes('evaluate') && promptLower.includes('products')) {
                return JSON.stringify([
                    {
                        asin: 'B08N5WRWNW',
                        suitability_score: 85,
                        matching_features: ['wireless', 'waterproof', 'durable'],
                        missing_features: ['long battery life'],
                        explanation: 'Good match for outdoor use with excellent durability'
                    },
                    {
                        asin: 'B07G2KHGQ8',
                        suitability_score: 92,
                        matching_features: ['wireless', 'long battery life', 'portable'],
                        missing_features: [],
                        explanation: 'Excellent match with all required features'
                    }
                ]);
            }
            
            // Default conversational response
            return "I understand your requirements and I'm processing them to find the best alternates for you.";
        },
        
        // Utility function for delays
        sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };
    
    // LLM-powered requirements processing
    window.processRequirementsWithLLM = async function(requirements) {
        const prompt = `
Extract key product requirements from this customer input:
"${requirements.text || requirements}"

Return a structured JSON with:
- specifications: technical specs needed
- price_constraints: budget or price preferences  
- use_case: intended use or context
- brand_preferences: preferred or excluded brands
- must_have_features: essential features
- nice_to_have_features: preferred but optional features

Customer input: "${requirements.text || requirements}"
        `.trim();
        
        try {
            const response = await window.BEDROCK_AGENT_INTEGRATION.makeRequest(prompt, {
                model: 'claude-3-sonnet',
                temperature: 0.3 // Lower temperature for structured extraction
            });
            
            if (response.success) {
                try {
                    const parsed = JSON.parse(response.response);
                    window.log('LLM requirements extraction successful:', parsed);
                    return {
                        success: true,
                        requirements: parsed,
                        source: 'llm'
                    };
                } catch (parseError) {
                    window.log('Error parsing LLM response:', parseError);
                    return {
                        success: false,
                        error: 'Invalid response format from LLM',
                        fallback: true
                    };
                }
            } else {
                return {
                    success: false,
                    error: response.error,
                    fallback: response.fallback
                };
            }
        } catch (error) {
            window.log('Error in LLM requirements processing:', error);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    };
    
    // LLM-powered search term generation
    window.generateSearchTermsWithLLM = async function(requirements) {
        const reqText = typeof requirements === 'string' ? requirements : 
                       requirements.text || JSON.stringify(requirements);
        
        const prompt = `
Based on these product requirements:
${reqText}

Generate 3-5 optimized search terms for finding suitable alternates on Amazon.
Focus on key specifications and use cases rather than specific brands.
Return as a JSON array of strings.

Requirements: ${reqText}
        `.trim();
        
        try {
            const response = await window.BEDROCK_AGENT_INTEGRATION.makeRequest(prompt, {
                model: 'claude-3-sonnet',
                temperature: 0.5 // Moderate creativity for search terms
            });
            
            if (response.success) {
                try {
                    const searchTerms = JSON.parse(response.response);
                    window.log('LLM search terms generation successful:', searchTerms);
                    return {
                        success: true,
                        searchTerms: Array.isArray(searchTerms) ? searchTerms : [searchTerms],
                        source: 'llm'
                    };
                } catch (parseError) {
                    window.log('Error parsing LLM search terms:', parseError);
                    return {
                        success: false,
                        error: 'Invalid search terms format from LLM',
                        fallback: true
                    };
                }
            } else {
                return {
                    success: false,
                    error: response.error,
                    fallback: response.fallback
                };
            }
        } catch (error) {
            window.log('Error in LLM search terms generation:', error);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    };
    
    // LLM-powered product evaluation
    window.evaluateProductsWithLLM = async function(products, requirements) {
        const reqText = typeof requirements === 'string' ? requirements : 
                       requirements.text || JSON.stringify(requirements);
        
        const productsText = Array.isArray(products) ? 
                           products.map(p => `${p.asin}: ${p.name || p.title}`).join('\n') :
                           JSON.stringify(products);
        
        const prompt = `
Evaluate these products against customer requirements:

Requirements: ${reqText}

Products:
${productsText}

For each product, provide:
- suitability_score: 0-100
- matching_features: list of features that match requirements
- missing_features: list of required features not met
- explanation: brief explanation of why it's suitable or not

Return top 8 products ranked by suitability as JSON array.
        `.trim();
        
        try {
            const response = await window.BEDROCK_AGENT_INTEGRATION.makeRequest(prompt, {
                model: 'claude-3-sonnet',
                temperature: 0.4 // Balanced creativity for evaluation
            });
            
            if (response.success) {
                try {
                    const evaluations = JSON.parse(response.response);
                    window.log('LLM product evaluation successful:', evaluations);
                    return {
                        success: true,
                        evaluations: Array.isArray(evaluations) ? evaluations : [evaluations],
                        source: 'llm'
                    };
                } catch (parseError) {
                    window.log('Error parsing LLM evaluations:', parseError);
                    return {
                        success: false,
                        error: 'Invalid evaluation format from LLM',
                        fallback: true
                    };
                }
            } else {
                return {
                    success: false,
                    error: response.error,
                    fallback: response.fallback
                };
            }
        } catch (error) {
            window.log('Error in LLM product evaluation:', error);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    };
    
    window.log('Bedrock Integration module loaded');
})();
