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
        
        // Perform the actual HTTP API request
        performRequest: async function(jsonInput, config) {
            try {
                window.log('API Request:', jsonInput.function);
                
                // Validate API key is configured
                if (!config.apiKey || config.apiKey === 'YOUR_API_KEY_HERE') {
                    throw new Error('API key not configured. Please set your API key in cqe-config.js');
                }
                
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);
                
                const response = await fetch(config.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': config.apiKey
                    },
                    body: JSON.stringify(jsonInput),
                    signal: controller.signal
                });
                
                // Clear timeout since request completed
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const rawResult = await response.text();
                
                // Handle response that might be wrapped in markdown code blocks
                let cleanedResult = rawResult;
                
                // Check if response is wrapped in ```json ... ``` blocks
                if (rawResult.includes('```json')) {
                    const jsonMatch = rawResult.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch && jsonMatch[1]) {
                        cleanedResult = jsonMatch[1].trim();
                    }
                } else if (rawResult.includes('```')) {
                    const codeMatch = rawResult.match(/```\s*([\s\S]*?)\s*```/);
                    if (codeMatch && codeMatch[1]) {
                        cleanedResult = codeMatch[1].trim();
                    }
                }
                
                // Try to parse the cleaned result as JSON
                let result;
                try {
                    result = JSON.parse(cleanedResult);
                } catch (parseError) {
                    console.error('API JSON parse error:', parseError.message);
                    console.error('Raw content:', cleanedResult);
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
                window.log('API request error:', error.message);
                
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
            const config = { ...(window.API_CONFIG || {}), ...options };
            let lastError = null;
            
            for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
                try {
                    if (attempt > 1) {
                        window.log(`API retry attempt ${attempt}/${config.maxRetries}`);
                    }
                    
                    const response = await this.performRequest(inputData, config);
                    
                    if (response.success) {
                        return response;
                    } else {
                        throw new Error(response.error || 'Unknown API error');
                    }
                    
                } catch (error) {
                    lastError = error;
                    
                    // Check for non-retryable errors
                    if (error.message.includes('Authentication failed') || 
                        error.message.includes('API access denied') ||
                        error.message.includes('HTTP 401') || 
                        error.message.includes('HTTP 403')) {
                        window.log('Authentication error - not retrying');
                        return {
                            success: false,
                            error: 'Authentication failed',
                            response: 'I\'m having trouble authenticating with the AI service. Please check that your API key is correctly set in cqe-config.js and that it\'s valid.',
                            authError: true
                        };
                    }
                    
                    // Check for API key configuration errors
                    if (error.message.includes('API key not configured')) {
                        window.log('API key configuration error - not retrying');
                        return {
                            success: false,
                            error: 'API key not configured',
                            response: 'Please set your API key in the cqe-config.js file. You can get your API key from the AWS Console after deploying the Bedrock API.',
                            configError: true
                        };
                    }
                    
                    // Don't retry on client errors (4xx except 429)
                    if (error.message.includes('HTTP 4') && !error.message.includes('HTTP 429')) {
                        break;
                    }
                    
                    // Wait before retry (exponential backoff)
                    if (attempt < config.maxRetries) {
                        const delay = config.retryDelay * Math.pow(2, attempt - 1);
                        await this.sleep(delay);
                    }
                }
            }
            
            // All retries failed
            window.log('API request failed after all retries:', lastError.message);
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
        
        try {
            const response = await window.API_INTEGRATION.makeRequest(agentInput);
            
            if (response.success) {
                try {
                    const parsed = JSON.parse(response.response);
                    
                    if (parsed.function_executed === 'search_term_generation' && parsed.search_term) {
                        window.log('Search term generated:', parsed.search_term);
                        
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
                    console.error('Failed to parse search term API response:', parseError);
                    window.log('Error parsing search term response:', parseError.message);
                    
                    return {
                        success: false,
                        error: 'Invalid JSON response from API',
                        rawResponse: response.response
                    };
                }
            } else {
                console.error('Search term API request failed:', response.error);
                return {
                    success: false,
                    error: response.error,
                    rawResponse: response.response
                };
            }
        } catch (error) {
            console.error('Error in generateSearchTermWithAgent:', error);
            window.log('Error generating search term:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    // Generate supplier summary using the HTTP API
    window.generateSupplierSummaryWithAgent = async function(formData) {
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
        
        try {
            const response = await window.API_INTEGRATION.makeRequest(agentInput);
            
            if (response.success) {
                try {
                    const parsed = JSON.parse(response.response);
                    
                    if (parsed.function_executed === 'supplier_summary' && parsed.summary) {
                        window.log('Supplier summary generated successfully');
                        
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
                    console.error('Failed to parse supplier summary API response:', parseError);
                    window.log('Error parsing supplier summary response:', parseError.message);
                    
                    return {
                        success: false,
                        error: 'Invalid JSON response from API',
                        rawResponse: response.response
                    };
                }
            } else {
                console.error('Supplier summary API request failed:', response.error);
                return {
                    success: false,
                    error: response.error,
                    rawResponse: response.response
                };
            }
        } catch (error) {
            console.error('Error in generateSupplierSummaryWithAgent:', error);
            window.log('Error generating supplier summary:', error.message);
            
            return {
                success: false,
                error: error.message
            };
        }
    };
    
    window.log('API Integration module loaded');
})();
