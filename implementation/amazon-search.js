// ==UserScript==
// @name         CQE Amazon Search Module
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  Amazon product search functionality for CQE Alternates Enhancement
// @author       Amazon
// @grant        none
// ==/UserScript==

'use strict';
    
    // Amazon Search Module - Self-contained search functionality
    window.AMAZON_SEARCH_MODULE = {
        
        // Generate search query from user input
        generateSearchQuery: function(itemDescription, mustHave, preferred, intent, productName) {
            window.log('🔍 Generating search query from user input');
            
            const searchTerms = [];
            
            // Extract key terms from item description (highest priority)
            if (itemDescription) {
                const itemTerms = this.extractKeyTerms(itemDescription);
                searchTerms.push(...itemTerms);
                window.log('🏷️ Item description terms:', itemTerms);
            }
            
            // Extract key terms from must-have attributes (second priority)
            if (mustHave) {
                const mustHaveTerms = this.extractKeyTerms(mustHave);
                searchTerms.push(...mustHaveTerms);
                window.log('📋 Must-have terms:', mustHaveTerms);
            }
            
            // Extract key terms from preferred attributes
            if (preferred) {
                const preferredTerms = this.extractKeyTerms(preferred);
                searchTerms.push(...preferredTerms);
                window.log('⭐ Preferred terms:', preferredTerms);
            }
            
            // Extract category from product name as fallback
            if (productName && searchTerms.length < 2) {
                const categoryTerms = this.extractCategoryFromProductName(productName);
                searchTerms.push(...categoryTerms);
                window.log('📦 Category terms from product name:', categoryTerms);
            }
            
            // Fallback to intent if we still don't have enough terms
            if (intent && searchTerms.length < 2) {
                const intentTerms = this.extractKeyTerms(intent);
                searchTerms.push(...intentTerms);
                window.log('💭 Intent terms:', intentTerms);
            }
            
            // Remove duplicates and create search query
            const uniqueTerms = [...new Set(searchTerms)];
            const searchQuery = uniqueTerms.slice(0, 5).join('+'); // Limit to 5 terms max
            
            window.log('🔎 Generated search query:', searchQuery);
            return searchQuery;
        },
        
        // Extract key terms from text input
        extractKeyTerms: function(text) {
            if (!text) return [];
            
            // Common stop words to filter out
            const stopWords = new Set([
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
                'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does',
                'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
                'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
                'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'need',
                'needs', 'want', 'wants', 'like', 'prefer', 'required', 'must', 'should', 'would'
            ]);
            
            // Extract meaningful terms
            const terms = text.toLowerCase()
                .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
                .split(/\s+/)
                .filter(term => term.length > 2 && !stopWords.has(term))
                .filter(term => !/^\d+$/.test(term)) // Remove pure numbers
                .slice(0, 10); // Limit to prevent overly long queries
            
            return terms;
        },
        
        // Extract category terms from product name
        extractCategoryFromProductName: function(productName) {
            if (!productName) return [];
            
            // Common product category patterns
            const categoryPatterns = [
                /binder\s*divider/i,
                /divider/i,
                /binder/i,
                /storage/i,
                /organizer/i,
                /folder/i,
                /file/i,
                /office/i,
                /school/i,
                /supplies/i
            ];
            
            const terms = [];
            const lowerName = productName.toLowerCase();
            
            categoryPatterns.forEach(pattern => {
                const match = lowerName.match(pattern);
                if (match) {
                    terms.push(match[0].replace(/\s+/g, '+'));
                }
            });
            
            return terms;
        },
        
        // Fetch search results from Amazon
        fetchSearchResults: async function(searchQuery) {
            if (!searchQuery) {
                throw new Error('No search query provided');
            }
            
            const searchConfig = window.SEARCH_CONFIG || { BASE_URL: 'https://www.amazon.com/s?k=', RETRY_ATTEMPTS: 2, TIMEOUT: 15000 };
            const searchUrl = searchConfig.BASE_URL + encodeURIComponent(searchQuery);
            window.log('📄 Fetching search results from:', searchUrl);
            
            let lastError;
            
            // Retry logic
            for (let attempt = 1; attempt <= searchConfig.RETRY_ATTEMPTS; attempt++) {
                try {
                    window.log(`🔄 Search attempt ${attempt}/${searchConfig.RETRY_ATTEMPTS}`);
                    
                    const response = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: searchUrl,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'DNT': '1',
                                'Connection': 'keep-alive',
                                'Upgrade-Insecure-Requests': '1'
                            },
                            onload: resolve,
                            onerror: reject,
                            ontimeout: () => reject(new Error('Request timeout')),
                            timeout: searchConfig.TIMEOUT
                        });
                    });
                    
                    if (response.status !== 200) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    window.log(`✅ Search results fetched successfully (${response.responseText.length} characters)`);
                    return response.responseText;
                    
                } catch (error) {
                    lastError = error;
                    window.log(`❌ Search attempt ${attempt} failed:`, error.message);
                    
                    if (attempt < searchConfig.RETRY_ATTEMPTS) {
                        // Wait before retry (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
            
            throw lastError;
        },
        
        // Parse search results HTML
        parseSearchResults: function(html) {
            window.log('🔍 Parsing search results HTML');
            
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Find all search result items
                const resultItems = doc.querySelectorAll('div[role="listitem"][data-asin]');
                window.log(`📋 Found ${resultItems.length} potential result items`);
                
                const allResults = [];
                
                // Extract all non-sponsored results from the page
                for (let i = 0; i < resultItems.length; i++) {
                    const item = resultItems[i];
                    
                    // Check if this is a sponsored result and skip it
                    const sponsoredElement = item.querySelector('span[aria-label="View Sponsored information or leave ad feedback"].a-color-secondary');
                    if (sponsoredElement && sponsoredElement.textContent.trim() === 'Sponsored') {
                        window.log('🚫 Skipping sponsored result');
                        continue;
                    }
                    
                    const result = this.extractProductData(item);
                    
                    if (result) {
                        allResults.push(result);
                        window.log(`✅ Extracted product ${allResults.length}:`, result.name.substring(0, 50) + '...');
                    }
                }
                
                window.log(`📦 Total non-sponsored results found: ${allResults.length}`);
                
                // Get the top 4 results to return
                const searchConfig = window.SEARCH_CONFIG || { MAX_RESULTS: 4 };
                const topResults = allResults.slice(0, searchConfig.MAX_RESULTS);
                
                // Log the remaining results to console
                if (allResults.length > searchConfig.MAX_RESULTS) {
                    const remainingResults = allResults.slice(searchConfig.MAX_RESULTS);
                    window.log(`📋 Additional ${remainingResults.length} results (not returned but logged for reference):`);
                    remainingResults.forEach((result, index) => {
                        window.log(`   ${index + searchConfig.MAX_RESULTS + 1}. ${result.name} (ASIN: ${result.asin})`);
                    });
                }
                
                window.log(`🎯 Returning top ${topResults.length} search results`);
                return topResults;
                
            } catch (error) {
                window.log('❌ Error parsing search results:', error);
                throw new Error('Failed to parse search results: ' + error.message);
            }
        },
        
        // Extract product data from a single search result item
        extractProductData: function(item) {
            try {
                // Extract ASIN
                const asin = item.getAttribute('data-asin');
                if (!asin || asin.length !== 10) {
                    return null; // Invalid ASIN
                }
                
                // Extract image
                const imgElement = item.querySelector('img.s-image');
                if (!imgElement || !imgElement.src) {
                    return null; // No image found
                }
                
                // Extract product name from h2 aria-label
                const h2Element = item.querySelector('h2');
                if (!h2Element) {
                    return null; // No title found
                }
                
                const productName = h2Element.getAttribute('aria-label') || h2Element.textContent?.trim();
                if (!productName || productName.length < 10) {
                    return null; // Invalid or too short product name
                }
                
                // Clean up product name (remove "Sponsored Ad -" prefix if present)
                const cleanName = productName.replace(/^Sponsored Ad\s*-\s*/i, '').trim();
                
                return {
                    asin: asin,
                    name: cleanName,
                    image: imgElement.src,
                    description: this.generateDescription(cleanName)
                };
                
            } catch (error) {
                window.log('⚠️ Error extracting product data from item:', error);
                return null;
            }
        },
        
        // Generate a brief description from product name
        generateDescription: function(productName) {
            if (!productName) return 'Amazon product';
            
            // Extract key features for description
            const name = productName.toLowerCase();
            const features = [];
            
            if (name.includes('tab')) features.push('tabbed organization');
            if (name.includes('clear')) features.push('clear visibility');
            if (name.includes('insertable')) features.push('customizable labels');
            if (name.includes('ring binder')) features.push('3-ring binder compatible');
            if (name.includes('divider')) features.push('section dividers');
            
            if (features.length > 0) {
                return `Product with ${features.slice(0, 2).join(' and ')}`;
            }
            
            return ''; // Return empty string instead of generic text
        },
        
        // Main search function - orchestrates the entire search process
        performSearch: async function(itemDescription, mustHave, preferred, intent, productName) {
            window.log('🚀 Starting Amazon search process');
            
            try {
                // Generate search query
                const searchQuery = this.generateSearchQuery(itemDescription, mustHave, preferred, intent, productName);
                
                if (!searchQuery) {
                    throw new Error('Could not generate search query from provided information');
                }
                
                // Fetch search results
                const html = await this.fetchSearchResults(searchQuery);
                
                // Parse results
                const results = this.parseSearchResults(html);
                
                if (results.length === 0) {
                    throw new Error('No valid products found in search results');
                }
                
                window.log(`🎉 Search completed successfully with ${results.length} results`);
                return results;
                
            } catch (error) {
                window.log('❌ Search process failed:', error);
                throw error;
            }
        }
    };
    
    window.log('Amazon Search module loaded');
