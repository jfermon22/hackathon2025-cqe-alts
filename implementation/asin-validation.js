// ==UserScript==
// @name         CQE ASIN Validation Module
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  ASIN validation and extraction utilities
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // ASIN validation utilities
    window.ASIN_VALIDATION = {
        // Standard ASIN regex pattern
        REGEX: /^([0-9]{9}[0-9X]|[A-Z][A-Z0-9]{9})$/,
        
        // Validate ASIN format
        validate: function(asin) {
            if (!asin || typeof asin !== 'string') {
                return { 
                    valid: false, 
                    error: "ASIN is required and must be a string" 
                };
            }
            
            // Remove whitespace and convert to uppercase
            const cleanASIN = asin.trim().toUpperCase();
            
            if (cleanASIN.length !== 10) {
                return { 
                    valid: false, 
                    error: "ASIN must be exactly 10 characters long" 
                };
            }
            
            if (!this.REGEX.test(cleanASIN)) {
                return { 
                    valid: false, 
                    error: "Invalid ASIN format. Must be 10 digits (last can be X) or start with letter followed by 9 alphanumeric characters" 
                };
            }
            
            return { 
                valid: true, 
                asin: cleanASIN 
            };
        },
        
        // Extract ASIN from various input formats
        extract: function(input) {
            if (!input || typeof input !== 'string') {
                return null;
            }
            
            const cleanInput = input.trim();
            
            // Direct ASIN
            if (cleanInput.length === 10) {
                const validation = this.validate(cleanInput);
                return validation.valid ? validation.asin : null;
            }
            
            // Amazon URL patterns
            const urlPatterns = [
                /\/dp\/([A-Z0-9]{10})/i,
                /\/gp\/product\/([A-Z0-9]{10})/i,
                /asin=([A-Z0-9]{10})/i,
                /\/([A-Z0-9]{10})(?:\/|\?|$)/i
            ];
            
            for (const pattern of urlPatterns) {
                const match = cleanInput.match(pattern);
                if (match && match[1]) {
                    const validation = this.validate(match[1]);
                    if (validation.valid) {
                        return validation.asin;
                    }
                }
            }
            
            return null;
        },
        
        // Format ASIN for display
        format: function(asin) {
            const validation = this.validate(asin);
            return validation.valid ? validation.asin : asin;
        }
    };
    
    // Enhanced input handling utilities
    window.INPUT_HANDLERS = {
        // Sanitize user input
        sanitize: function(input) {
            if (!input || typeof input !== 'string') {
                return '';
            }
            
            return input
                .trim()
                .replace(/[<>]/g, '') // Remove potential HTML tags
                .substring(0, 1000); // Limit length
        },
        
        // Validate requirements input
        validateRequirements: function(requirements) {
            const sanitized = this.sanitize(requirements);
            
            if (!sanitized) {
                return {
                    valid: false,
                    error: "Please provide some requirements for the alternate products."
                };
            }
            
            if (sanitized.length < 10) {
                return {
                    valid: false,
                    error: "Please provide more detailed requirements (at least 10 characters)."
                };
            }
            
            return {
                valid: true,
                requirements: sanitized
            };
        },
        
        // Extract key information from requirements
        extractKeywords: function(requirements) {
            if (!requirements) return [];
            
            const text = requirements.toLowerCase();
            const keywords = [];
            
            // Price-related keywords
            if (text.includes('price') || text.includes('cost') || text.includes('budget') || text.includes('cheap') || text.includes('expensive')) {
                keywords.push('price-sensitive');
            }
            
            // Brand-related keywords
            const brandMatches = text.match(/\b(brand|manufacturer|made by|from)\b/g);
            if (brandMatches) {
                keywords.push('brand-specific');
            }
            
            // Technical specifications
            if (text.includes('spec') || text.includes('technical') || text.includes('performance') || text.includes('feature')) {
                keywords.push('technical-specs');
            }
            
            // Quality-related
            if (text.includes('quality') || text.includes('durable') || text.includes('reliable')) {
                keywords.push('quality-focused');
            }
            
            // Use case related
            if (text.includes('use') || text.includes('purpose') || text.includes('application')) {
                keywords.push('use-case-specific');
            }
            
            return keywords;
        }
    };
    
    window.log('ASIN Validation module loaded');
})();
