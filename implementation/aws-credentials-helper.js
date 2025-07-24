// ==UserScript==
// @name         AWS Credentials Helper for Browser
// @namespace    http://amazon.com/cqe
// @version      1.0
// @description  Helper for managing AWS credentials in browser environment
// @author       Amazon
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // AWS Credentials Helper for Browser Environment
    window.AWS_CREDENTIALS_HELPER = {
        // Store credentials temporarily (not persistent for security)
        temporaryCredentials: null,
        
        // Set temporary credentials for testing
        setTemporaryCredentials: function(accessKeyId, secretAccessKey, sessionToken = null) {
            console.log('🔐 Setting temporary AWS credentials for browser testing');
            
            this.temporaryCredentials = {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
                sessionToken: sessionToken
            };
            
            console.log('✅ Temporary credentials set (expires when page reloads)');
            
            // Show warning about security
            console.warn('⚠️ SECURITY WARNING: These credentials are stored in memory only and will be lost when the page reloads. Do not use production credentials in browser environment.');
            
            return true;
        },
        
        // Get stored credentials
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
        
        // Clear stored credentials
        clearCredentials: function() {
            console.log('🔐 Clearing temporary credentials');
            this.temporaryCredentials = null;
            console.log('✅ Temporary credentials cleared');
        },
        
        // Check if credentials are available
        hasCredentials: function() {
            return !!this.temporaryCredentials;
        },
        
        // Interactive credential setup (for testing)
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
        
        // Create AWS SDK compatible credentials object
        createCredentialsProvider: function() {
            if (!this.hasCredentials()) {
                console.log('🔐 No credentials available for provider');
                return null;
            }
            
            const creds = this.getCredentials();
            
            // Return AWS SDK v3 compatible credentials object
            return {
                accessKeyId: creds.accessKeyId,
                secretAccessKey: creds.secretAccessKey,
                sessionToken: creds.sessionToken
            };
        },
        
        // Display current credential status
        showStatus: function() {
            console.log('🔐 AWS Credentials Status:');
            console.log(`   Has Credentials: ${this.hasCredentials()}`);
            
            if (this.hasCredentials()) {
                const creds = this.getCredentials();
                console.log(`   Access Key ID: ${creds.accessKeyId ? creds.accessKeyId.substring(0, 8) + '...' : 'Not set'}`);
                console.log(`   Secret Key: ${creds.secretAccessKey ? '***' + creds.secretAccessKey.substring(creds.secretAccessKey.length - 4) : 'Not set'}`);
                console.log(`   Session Token: ${creds.sessionToken ? 'Present' : 'Not set'}`);
            }
            
            console.log('');
            console.log('🔧 Available Methods:');
            console.log('   AWS_CREDENTIALS_HELPER.setupCredentialsInteractively() - Interactive setup');
            console.log('   AWS_CREDENTIALS_HELPER.setTemporaryCredentials(keyId, secret, token) - Manual setup');
            console.log('   AWS_CREDENTIALS_HELPER.clearCredentials() - Clear credentials');
            console.log('   AWS_CREDENTIALS_HELPER.showStatus() - Show this status');
        }
    };
    
    // Auto-display status on load
    setTimeout(() => {
        console.log('🔐 AWS Credentials Helper loaded');
        console.log('💡 Use AWS_CREDENTIALS_HELPER.showStatus() to see available options');
        console.log('💡 Use AWS_CREDENTIALS_HELPER.setupCredentialsInteractively() for quick setup');
    }, 1000);
    
    if (window.log) {
        window.log('AWS Credentials Helper module loaded');
    }
})();
