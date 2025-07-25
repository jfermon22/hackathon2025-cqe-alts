// ==UserScript==
// @name         CQE API Integration Module
// @namespace    http://amazon.com/cqe
// @version      4.0
// @description  HTTP API integration for CQE Alternates Enhancement
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // HTTP API Integration System
    window.API_INTEGRATION = {
        // Configuration - HTTP API Endpoint
        CONFIG: {
            apiEndpoint: 'https://dzzzjrtgc8.execute-api.us-west-2.amazonaws.com/invoke-agent',
            timeout: 30000, // 30 second timeout
            maxRetries: 3,
            retryDelay: 1000 // 1 second base delay
        },
        
        // Perform the actual HTTP API request
        performRequest: async function(jsonInput, config) {
            console.log('🔍 DEBUG: performRequest called with input:', jsonInput);
            console.log('🔍 DEBUG: Using HTTP API endpoint:', config.apiEndpoint);
            
            try {
                console.log('🔍 DEBUG: Making HTTP POST request...');
                window.log('Making HTTP API request to:', config.apiEndpoint);
                
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);
                
                const response = await fetch(config.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(jsonInput),
                    signal: controller.signal
                });
                
                // Clear timeout since request completed
                clearTimeout(timeoutId);
                
                console.log('🔍 DEBUG: HTTP response status:', response.status, response.statusText);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const rawResult = await response.text();
                console.log('🔍 DEBUG: Raw HTTP API response:', rawResult);
                
                // Handle response that might be wrapped in markdown code blocks
                let cleanedResult = rawResult;
                
                // Check if response is wrapped in ```json ... ``` blocks
                if (rawResult.includes('```json')) {
                    console.log('🔍 DEBUG: Response contains markdown code blocks, extracting JSON...');
                    const jsonMatch = rawResult.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch && jsonMatch[1]) {
                        cleanedResult = jsonMatch[1].trim();
                        console.log('🔍 DEBUG: Extracted JSON from markdown:', cleanedResult);
                    }
                } else if (rawResult.includes('```')) {
                    console.log('🔍 DEBUG: Response contains generic code blocks, extracting content...');
                    const codeMatch = rawResult.match(/```\s*([\s\S]*?)\s*```/);
                    if (codeMatch && codeMatch[1]) {
                        cleanedResult = codeMatch[1].trim();
                        console.log('🔍 DEBUG: Extracted content from code blocks:', cleanedResult);
                    }
                }
                
                // Try to parse the cleaned result as JSON
                let result;
                try {
                    result = JSON.parse(cleanedResult);
                    console.log('🔍 DEBUG: Successfully parsed JSON:', result);
                } catch (parseError) {
                    console.log('🔍 DEBUG: Failed to parse as JSON, treating as plain text:', parseError);
                    console.log('🔍 DEBUG: Raw content that failed to parse:', cleanedResult);
                    throw new Error(`Invalid JSON response from API: ${parseError.message}`);
                }
                
                return {
                    success: true,
                    response: JSON.stringify(result), // Convert back to string for existing parsing logic
                    model: 'http-api',
                    requestId: Date.now().toString(),
                    usage: {
                        promptTokens: Math.floor(JSON.stringify(jsonInput).length / 4),
                        completionTokens: Math.floor(JSON.stringify(result).length / 4),
                        totalTokens: Math.floor(JSON.stringify(jsonInput).length / 4) + Math.floor(JSON.stringify(result).length / 4)
                    }
                };
                
            } catch (error) {
                console.log('🔍 DEBUG: Error in performRequest:', error);
                console.log('🔍 DEBUG: Error message:', error.message);
                console.log('🔍 DEBUG: Error name:', error.name);
                
                window.log('HTTP API request error:', error);
                
                // Handle different types of errors
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout: The API request took too long to complete.');
                } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    throw new Error('Network error: Unable to connect to the API endpoint.');
                } else if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) {
                    throw new Error('Authentication failed: API access denied.');
                } else if (error.message.includes('HTTP 429')) {
                    throw new Error('Rate limit exceeded: Too many requests to the API.');
                } else if (error.message.includes('HTTP 5')) {
                    throw new Error('Server error: The API service is temporarily unavailable.');
                }
                
                throw error;
            }
        },
        
        // Make HTTP API request with retry logic
        makeRequest: async function(inputData, options = {}) {
            console.log('🔍 DEBUG: makeRequest called with input:', inputData);
            console.log('🔍 DEBUG: makeRequest options:', options);
            
            const config = { ...this.CONFIG, ...options };
            let lastError = null;
            
            for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
                try {
                    console.log(`🔍 DEBUG: HTTP API attempt ${attempt}/${config.maxRetries}`);
                    window.log(`HTTP API attempt ${attempt}/${config.maxRetries}`);
                    
                    console.log('🔍 DEBUG: About to call this.performRequest...');
                    const response = await this.performRequest(inputData, config);
                    console.log('🔍 DEBUG: performRequest returned:', response);
                    
                    if (response.success) {
                        window.log('HTTP API request successful');
                        return response;
                    } else {
                        throw new Error(response.error || 'Unknown API error');
                    }
                    
                } catch (error) {
                    lastError = error;
                    window.log(`HTTP API attempt ${attempt} failed:`, error.message);
                    
                    // Check for non-retryable errors
                    if (error.message.includes('Authentication failed') || 
                        error.message.includes('API access denied') ||
                        error.message.includes('HTTP 401') || 
                        error.message.includes('HTTP 403')) {
                        window.log('Authentication error detected, not retrying');
                        return {
                            success: false,
                            error: 'Authentication failed',
                            response: 'I\'m having trouble authenticating with the AI service. Please check the API endpoint configuration.',
                            authError: true
                        };
                    }
                    
                    // Don't retry on client errors (4xx except 429)
                    if (error.message.includes('HTTP 4') && !error.message.includes('HTTP 429')) {
                        window.log('Client error detected, not retrying');
                        break;
                    }
                    
                    // Wait before retry (exponential backoff)
                    if (attempt < config.maxRetries) {
                        const delay = config.retryDelay * Math.pow(2, attempt - 1);
                        console.log(`🔍 DEBUG: Waiting ${delay}ms before retry...`);
                        await this.sleep(delay);
                    }
                }
            }
            
            // All retries failed
            window.log('All HTTP API attempts failed:', lastError);
            return {
                success: false,
                error: lastError.message || 'HTTP API service unavailable',
                response: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again in a moment.'
            };
        },
        
        // Utility function for delays
        sleep: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    };
    
    // Multi-Function Agent Integration Functions (Updated for HTTP API)
    
    // Generate search term using the HTTP API
    window.generateSearchTermWithAgent = async function(formData) {
        console.log('🔍 generateSearchTermWithAgent called with:', formData);
        window.log('Generating search term with HTTP API');
        
        // Prepare the input object for search term generation
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
        
        console.log('📤 RAW INPUT TO API (Search Term Generation):', JSON.stringify(agentInput, null, 2));
        
        try {
            const response = await window.API_INTEGRATION.makeRequest(agentInput);
            
            if (response.success) {
                console.log('📥 RAW OUTPUT FROM API (Search Term Generation):', response.response);
                
                try {
                    const parsed = JSON.parse(response.response);
                    
                    if (parsed.function_executed === 'search_term_generation' && parsed.search_term) {
                        console.log('🎯 EXTRACTED SEARCH TERM:', `"${parsed.search_term}"`);
                        window.log('Search term generated successfully via HTTP API:', parsed.search_term);
                        
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
                    console.error('❌ Failed to parse API response:', parseError);
                    window.log('Error parsing search term response from HTTP API:', parseError.message);
                    
                    return {
                        success: false,
                        error: 'Invalid JSON response from API',
                        rawResponse: response.response
                    };
                }
            } else {
                console.error('❌ API request failed:', response.error);
                return {
                    success: false,
                    error: response.error,
                    rawResponse: response.response
                };
            }
        } catch (error) {
            console.error('❌ Error in generateSearchTermWithAgent:', error);
            window.log('Error generating search term via HTTP API:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    // Generate supplier summary using the HTTP API
    window.generateSupplierSummaryWithAgent = async function(formData) {
        console.log('📋 generateSupplierSummaryWithAgent called with:', formData);
        window.log('Generating supplier summary with HTTP API');
        
        // Prepare the input object for supplier summary generation
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
        
        console.log('📤 RAW INPUT TO API (Supplier Summary):', JSON.stringify(agentInput, null, 2));
        
        try {
            const response = await window.API_INTEGRATION.makeRequest(agentInput);
            
            if (response.success) {
                console.log('📥 RAW OUTPUT FROM API (Supplier Summary):', response.response);
                
                try {
                    const parsed = JSON.parse(response.response);
                    
                    if (parsed.function_executed === 'supplier_summary' && parsed.summary) {
                        console.log('📄 EXTRACTED SUMMARY:');
                        console.log('────────────────────────────────────────');
                        console.log(parsed.summary);
                        console.log('────────────────────────────────────────');
                        
                        window.log('Supplier summary generated successfully via HTTP API');
                        
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
                    console.error('❌ Failed to parse API response:', parseError);
                    window.log('Error parsing supplier summary response from HTTP API:', parseError.message);
                    
                    return {
                        success: false,
                        error: 'Invalid JSON response from API',
                        rawResponse: response.response
                    };
                }
            } else {
                console.error('❌ API request failed:', response.error);
                return {
                    success: false,
                    error: response.error,
                    rawResponse: response.response
                };
            }
        } catch (error) {
            console.error('❌ Error in generateSupplierSummaryWithAgent:', error);
            window.log('Error generating supplier summary via HTTP API:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    window.log('API Integration module loaded');
})();
