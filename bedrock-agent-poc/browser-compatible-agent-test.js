/**
 * Browser-Compatible Multi-Function Bedrock Agent Test
 * 
 * This POC mimics the browser environment by dynamically loading AWS SDK v3
 * instead of using static imports, matching the browser integration approach.
 */

// Simulate browser environment globals
global.console = console;
global.TextDecoder = TextDecoder;

// Browser-compatible AWS SDK v3 loader (mimics browser integration)
class BrowserCompatibleBedrockIntegration {
    constructor() {
        this.CONFIG = {
            region: 'us-west-2',
            agentId: 'CAP1I3RZLN',
            agentAliasId: 'HPTZBY3CYT',
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000
        };
        
        // SDK v3 modules and client management (like browser)
        this.sdkLoaded = false;
        this.BedrockAgentRuntimeClient = null;
        this.InvokeAgentCommand = null;
        this.client = null;
        this.currentSessionId = null;
    }
    
    // Initialize AWS SDK v3 using dynamic import (browser-style)
    async initializeSDK() {
        console.log('🔍 DEBUG: initializeSDK v3 called (browser-compatible)');
        
        if (this.sdkLoaded && this.BedrockAgentRuntimeClient && this.InvokeAgentCommand) {
            console.log('🔍 DEBUG: SDK v3 already loaded, returning true');
            return true;
        }
        
        try {
            console.log('🔍 DEBUG: Loading AWS SDK v3 modules dynamically...');
            
            // Dynamic import (simulates browser CDN loading)
            const sdkModule = await import('@aws-sdk/client-bedrock-agent-runtime');
            console.log('🔍 DEBUG: Successfully loaded SDK via dynamic import');
            
            // Extract the required classes
            this.BedrockAgentRuntimeClient = sdkModule.BedrockAgentRuntimeClient;
            this.InvokeAgentCommand = sdkModule.InvokeAgentCommand;
            
            if (!this.BedrockAgentRuntimeClient || !this.InvokeAgentCommand) {
                throw new Error('Required AWS SDK v3 classes not found in module');
            }
            
            this.sdkLoaded = true;
            console.log('🔍 DEBUG: AWS SDK v3 loaded and configured successfully (browser-compatible)');
            return true;
            
        } catch (error) {
            console.log('🔍 DEBUG: Failed to load AWS SDK v3 dynamically:', error);
            return false;
        }
    }
    
    // Initialize Bedrock Agent Runtime client (browser-compatible)
    async initializeClient() {
        if (this.client) {
            return this.client;
        }
        
        const sdkReady = await this.initializeSDK();
        if (!sdkReady) {
            throw new Error('AWS SDK v3 not available');
        }
        
        try {
            console.log('🔍 DEBUG: Creating BedrockAgentRuntimeClient with browser-compatible config...');
            
            // Browser-compatible client configuration
            const clientConfig = {
                region: this.CONFIG.region,
                // Add browser-specific configuration
                credentials: undefined, // Let environment handle credentials automatically
                maxAttempts: 3,
                requestHandler: undefined // Use default request handler
            };
            
            console.log('🔍 DEBUG: Client config:', clientConfig);
            
            // Create Bedrock Agent Runtime client with browser-compatible approach
            this.client = new this.BedrockAgentRuntimeClient(clientConfig);
            
            console.log('🔍 DEBUG: BedrockAgentRuntimeClient created successfully (browser-compatible)');
            return this.client;
            
        } catch (error) {
            console.log('🔍 DEBUG: Failed to create BedrockAgentRuntimeClient:', error);
            
            // Try alternative initialization approach
            try {
                console.log('🔍 DEBUG: Trying alternative client initialization...');
                
                // Minimal configuration approach
                this.client = new this.BedrockAgentRuntimeClient({
                    region: this.CONFIG.region
                });
                
                console.log('🔍 DEBUG: Alternative client initialization successful');
                return this.client;
                
            } catch (altError) {
                console.log('🔍 DEBUG: Alternative client initialization also failed:', altError);
                throw new Error(`Failed to initialize Bedrock client: ${error.message}. Alternative approach also failed: ${altError.message}`);
            }
        }
    }
    
    generateSessionId() {
        return 'browser_compat_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getSessionId() {
        if (!this.currentSessionId) {
            this.currentSessionId = this.generateSessionId();
        }
        return this.currentSessionId;
    }
    
    resetSession() {
        this.currentSessionId = null;
    }
    
    // Perform the actual Bedrock Agent request (browser-compatible)
    async performRequest(prompt, config) {
        console.log('🔍 DEBUG: performRequest v3 called (browser-compatible) with prompt:', prompt.substring(0, 50) + '...');
        console.log('🔍 DEBUG: Using dynamically loaded AWS SDK v3 Bedrock Agent implementation');
        
        try {
            console.log('🔍 DEBUG: Attempting to initialize client v3 (browser-compatible)...');
            const client = await this.initializeClient();
            const sessionId = this.getSessionId();
            
            console.log('🔍 DEBUG: Client v3 initialized, invoking Bedrock Agent...');
            
            // Create command exactly like the POC
            const command = new this.InvokeAgentCommand({
                agentId: config.agentId,
                agentAliasId: config.agentAliasId,
                sessionId: sessionId,
                inputText: prompt
            });
            
            console.log('🔍 DEBUG: Bedrock Agent v3 command created (browser-compatible):', {
                agentId: config.agentId,
                agentAliasId: config.agentAliasId,
                sessionId: sessionId,
                inputLength: prompt.length
            });
            
            // Make the actual Bedrock Agent call
            console.log('🔍 DEBUG: Sending command to Bedrock Agent v3 (browser-compatible)...');
            const response = await client.send(command);
            
            console.log('🔍 DEBUG: Bedrock Agent v3 response received (browser-compatible):', response);
            
            if (!response.completion) {
                throw new Error('No completion in response');
            }
            
            // Process streaming response exactly like the POC
            console.log('🔍 DEBUG: Processing streaming response (browser-compatible)...');
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
            
            console.log('🔍 DEBUG: Final completion v3 (browser-compatible):', completion);
            
            return {
                success: true,
                response: completion,
                model: 'bedrock-agent-v3-browser-compatible',
                requestId: sessionId,
                usage: {
                    promptTokens: Math.floor(prompt.length / 4),
                    completionTokens: Math.floor(completion.length / 4),
                    totalTokens: Math.floor(prompt.length / 4) + Math.floor(completion.length / 4)
                }
            };
            
        } catch (error) {
            console.log('🔍 DEBUG: Error in performRequest v3 (browser-compatible):', error);
            console.log('🔍 DEBUG: Error message:', error.message);
            console.log('🔍 DEBUG: Error stack:', error.stack);
            
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
    }
    
    // Make LLM request with retry logic (browser-compatible)
    async makeRequest(prompt, options = {}) {
        console.log('🔍 DEBUG: makeRequest v3 called (browser-compatible) with prompt:', prompt.substring(0, 50) + '...');
        console.log('🔍 DEBUG: makeRequest v3 options:', options);
        
        const config = { ...this.CONFIG, ...options };
        let lastError = null;
        
        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            try {
                console.log(`🔍 DEBUG: Bedrock Agent v3 attempt ${attempt}/${config.maxRetries} (browser-compatible)`);
                
                console.log('🔍 DEBUG: About to call this.performRequest v3 (browser-compatible)...');
                const response = await this.performRequest(prompt, config);
                console.log('🔍 DEBUG: performRequest v3 returned (browser-compatible):', response);
                
                if (response.success) {
                    console.log('Bedrock Agent v3 request successful (browser-compatible)');
                    return response;
                } else {
                    throw new Error(response.error || 'Unknown API error');
                }
                
            } catch (error) {
                lastError = error;
                console.log(`Bedrock API v3 attempt ${attempt} failed (browser-compatible):`, error.message);
                
                // Check for authentication errors - don't retry these
                if (error.message.includes('Authentication failed') || 
                    error.message.includes('credentials') || 
                    error.message.includes('unauthorized') || 
                    error.message.includes('ExpiredToken') ||
                    error.status === 401 || 
                    error.status === 403) {
                    console.log('Authentication error detected, notifying user');
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
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        // All retries failed
        console.log('All Bedrock Agent v3 attempts failed (browser-compatible):', lastError);
        return {
            success: false,
            error: lastError.message || 'Bedrock Agent service unavailable',
            response: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again in a moment.'
        };
    }
}

// Multi-Function Agent Integration Functions (Browser-Compatible)
const browserIntegration = new BrowserCompatibleBedrockIntegration();

// Generate search term using the multi-function agent (browser-compatible)
async function generateSearchTermWithAgent(formData) {
    console.log('🔍 generateSearchTermWithAgent v3 called (browser-compatible) with:', formData);
    
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
    console.log('📤 RAW INPUT TO AGENT v3 (Search Term Generation - Browser-Compatible):', jsonInput);
    
    try {
        const response = await browserIntegration.makeRequest(jsonInput);
        
        if (response.success) {
            console.log('📥 RAW OUTPUT FROM AGENT v3 (Search Term Generation - Browser-Compatible):', response.response);
            
            try {
                const parsed = JSON.parse(response.response);
                
                if (parsed.function_executed === 'search_term_generation' && parsed.search_term) {
                    console.log('🎯 EXTRACTED SEARCH TERM v3 (Browser-Compatible):', `"${parsed.search_term}"`);
                    
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
                console.error('❌ Failed to parse agent v3 response (browser-compatible):', parseError);
                
                return {
                    success: false,
                    error: 'Invalid JSON response from agent',
                    rawResponse: response.response
                };
            }
        } else {
            console.error('❌ Agent v3 request failed (browser-compatible):', response.error);
            return {
                success: false,
                error: response.error,
                rawResponse: response.response
            };
        }
    } catch (error) {
        console.error('❌ Error in generateSearchTermWithAgent v3 (browser-compatible):', error);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Generate supplier summary using the multi-function agent (browser-compatible)
async function generateSupplierSummaryWithAgent(formData) {
    console.log('📋 generateSupplierSummaryWithAgent v3 called (browser-compatible) with:', formData);
    
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
    console.log('📤 RAW INPUT TO AGENT v3 (Supplier Summary - Browser-Compatible):', jsonInput);
    
    try {
        const response = await browserIntegration.makeRequest(jsonInput);
        
        if (response.success) {
            console.log('📥 RAW OUTPUT FROM AGENT v3 (Supplier Summary - Browser-Compatible):', response.response);
            
            try {
                const parsed = JSON.parse(response.response);
                
                if (parsed.function_executed === 'supplier_summary' && parsed.summary) {
                    console.log('📄 EXTRACTED SUMMARY v3 (Browser-Compatible):');
                    console.log('────────────────────────────────────────');
                    console.log(parsed.summary);
                    console.log('────────────────────────────────────────');
                    
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
                console.error('❌ Failed to parse agent v3 response (browser-compatible):', parseError);
                
                return {
                    success: false,
                    error: 'Invalid JSON response from agent',
                    rawResponse: response.response
                };
            }
        } else {
            console.error('❌ Agent v3 request failed (browser-compatible):', response.error);
            return {
                success: false,
                error: response.error,
                rawResponse: response.response
            };
        }
    } catch (error) {
        console.error('❌ Error in generateSupplierSummaryWithAgent v3 (browser-compatible):', error);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Test data configurations for both functions
const testData = {
    searchTermGeneration: {
        originalProduct: "Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set",
        itemDescription: "binder dividers for office organization",
        mustHaveAttributes: "tabs, insertable, clear",
        preferredAttributes: "colorful, durable"
    },
    
    supplierSummary: {
        customerUsageIntent: "Need binder dividers for organizing client files in law office, daily use by multiple staff members",
        originalProduct: "Avery 8-Tab Binder Dividers, Insertable Clear Big Tabs, 1 Set",
        itemDescription: "Professional binder dividers with clear tabs for document organization",
        mustHaveAttributes: "professional appearance, durable construction, clear labeling, standard 3-ring holes",
        preferredAttributes: "reinforced tabs, write-on surface, multiple colors available"
    }
};

// Parse command line arguments
const parseArgs = () => {
    const args = process.argv.slice(2);
    const testType = args.find(arg => arg.startsWith('--test='))?.split('=')[1] || 'both';
    const help = args.includes('--help') || args.includes('-h');
    
    return { testType: testType.toLowerCase(), help };
};

// Display help information
const showHelp = () => {
    console.log(`
🔧 Browser-Compatible Multi-Function Product Request Processing Agent Test

Usage: node browser-compatible-agent-test.js [options]

Options:
  --test=both      Test both functions (default)
  --test=search    Test search term generation only
  --test=supplier  Test supplier summary only
  --help, -h       Show this help message

Examples:
  node browser-compatible-agent-test.js
  node browser-compatible-agent-test.js --test=search
  node browser-compatible-agent-test.js --test=supplier

This POC mimics browser environment by dynamically loading AWS SDK v3
instead of using static imports, matching the browser integration approach.
`);
};

// Test search term generation function
const testSearchTermGeneration = async () => {
    console.log(`\n🔍 TESTING SEARCH TERM GENERATION FUNCTION (Browser-Compatible)`);
    console.log(`${'='.repeat(70)}`);
    
    try {
        const result = await generateSearchTermWithAgent(testData.searchTermGeneration);
        
        if (result.success && result.searchTerm) {
            console.log(`🎉 SUCCESS! Search Term Generation Response (Browser-Compatible):`);
            console.log(`${'='.repeat(70)}`);
            console.log(`🎯 EXTRACTED SEARCH TERM: "${result.searchTerm}"`);
            console.log(`${'='.repeat(70)}`);
            
            return { success: true, result };
        } else {
            console.log(`❌ Search Term Generation Test Failed (Browser-Compatible): ${result.error}`);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.log(`❌ Search Term Generation Test Failed (Browser-Compatible): ${error.message}`);
        return { success: false, error };
    }
};

// Test supplier summary function
const testSupplierSummary = async () => {
    console.log(`\n📋 TESTING SUPPLIER SUMMARY FUNCTION (Browser-Compatible)`);
    console.log(`${'='.repeat(70)}`);
    
    try {
        const result = await generateSupplierSummaryWithAgent(testData.supplierSummary);
        
        if (result.success && result.summary) {
            console.log(`🎉 SUCCESS! Supplier Summary Response (Browser-Compatible):`);
            console.log(`${'='.repeat(70)}`);
            console.log(`📄 EXTRACTED SUMMARY:`);
            console.log(`${'─'.repeat(40)}`);
            console.log(result.summary);
            console.log(`${'─'.repeat(40)}`);
            console.log(`${'='.repeat(70)}`);
            
            return { success: true, result };
        } else {
            console.log(`❌ Supplier Summary Test Failed (Browser-Compatible): ${result.error}`);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.log(`❌ Supplier Summary Test Failed (Browser-Compatible): ${error.message}`);
        return { success: false, error };
    }
};

// Main execution function
const main = async () => {
    const { testType, help } = parseArgs();
    
    if (help) {
        showHelp();
        return;
    }

    console.log(`🎯 Browser-Compatible Multi-Function Product Request Processing Agent Test Starting...`);
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log(`🧪 Test Type: ${testType.toUpperCase()}`);
    console.log(`🔧 Loading Method: Dynamic Import (Browser-Compatible)`);
    console.log(`${'='.repeat(70)}`);
    
    const results = {
        searchTerm: null,
        supplierSummary: null,
        overall: { passed: 0, failed: 0 }
    };
    
    try {
        // Run tests based on the specified type
        if (testType === 'both' || testType === 'search') {
            results.searchTerm = await testSearchTermGeneration();
            if (results.searchTerm.success) {
                results.overall.passed++;
            } else {
                results.overall.failed++;
            }
        }
        
        if (testType === 'both' || testType === 'supplier') {
            results.supplierSummary = await testSupplierSummary();
            if (results.supplierSummary.success) {
                results.overall.passed++;
            } else {
                results.overall.failed++;
            }
        }
        
        // Display final results
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📊 FINAL TEST RESULTS (Browser-Compatible)`);
        console.log(`${'='.repeat(70)}`);
        console.log(`✅ Tests Passed: ${results.overall.passed}`);
        console.log(`❌ Tests Failed: ${results.overall.failed}`);
        console.log(`📈 Success Rate: ${results.overall.passed + results.overall.failed > 0 ? 
            Math.round((results.overall.passed / (results.overall.passed + results.overall.failed)) * 100) : 0}%`);
        
        if (results.overall.failed === 0) {
            console.log(`🎉 All tests passed! Browser-compatible multi-function agent is working correctly.`);
        } else {
            console.log(`⚠️ Some tests failed. Please check the error details above.`);
        }
        
        console.log(`⏰ Test completed at: ${new Date().toISOString()}`);
        
    } catch (error) {
        console.log(`${'='.repeat(70)}`);
        console.log(`💥 CRITICAL ERROR! Browser-Compatible Test Suite Failed:`);
        console.log(`${'='.repeat(70)}`);
        console.error(`Error: ${error.message}`);
        
        // Provide troubleshooting guidance
        console.log(`\n🔧 Troubleshooting Tips:`);
        console.log(`1. Ensure AWS credentials are configured (aws configure)`);
        console.log(`2. Verify IAM permissions for bedrock:InvokeAgent`);
        console.log(`3. Check that the Multi-Function agent is deployed and active`);
        console.log(`4. Confirm the agent ID (CAP1I3RZLN) and alias ID (HPTZBY3CYT) are correct`);
        console.log(`5. Ensure you're in the correct AWS region (us-west-2)`);
        console.log(`6. Verify the agent has been updated with multi-function capabilities`);
        console.log(`7. Check that dynamic import of AWS SDK v3 is working in your environment`);
        
        process.exit(1);
    }
};

// Call function if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
