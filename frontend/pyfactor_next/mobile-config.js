// Mobile App Configuration
// Centralized configuration for API endpoints

const MobileConfig = {
    // Environment Detection
    isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    // API Endpoints
    getApiUrl() {
        if (this.isDevelopment) {
            return 'http://localhost:8000';
        }
        // Mobile apps should call backend directly, not through frontend proxy
        return 'https://dott-api-staging.onrender.com';
    },
    
    // Frontend URL (for web links, OAuth callbacks that need web interface)
    getWebUrl() {
        if (this.isDevelopment) {
            return 'http://localhost:3000';
        }
        return 'https://staging.dottapps.com';
    },
    
    // Auth Endpoints
    auth: {
        login: '/api/auth/consolidated-login',
        signup: '/api/auth/signup',
        forgotPassword: '/api/auth/forgot-password',
        session: '/api/auth/session-v2',
        exchange: '/api/auth/exchange-v2',
        oauthAppleCallback: '/api/auth/oauth/apple-callback'
    },
    
    // API Endpoints
    api: {
        userProfile: '/api/users/me/',
        businessFeatures: '/api/users/business-features/',
        notifications: '/api/notifications/unread-count',
        marketplace: '/api/marketplace/businesses/',
        currency: '/api/currency/preferences'
    },
    
    // Helper Methods
    getAuthUrl(endpoint) {
        return this.getApiUrl() + this.auth[endpoint];
    },
    
    getApiEndpoint(endpoint) {
        return this.getApiUrl() + this.api[endpoint];
    }
};

// Export for use in HTML files
if (typeof window !== 'undefined') {
    window.MobileConfig = MobileConfig;
}