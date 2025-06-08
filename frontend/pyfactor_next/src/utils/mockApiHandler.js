'use client';


import { logger } from './logger';

/**
 * Mock API handler for development
 * Provides fallback responses when real API endpoints are unavailable
 */
class MockApiHandler {
  constructor() {
    this.initialized = false;
    this.mocks = {};
    this.originalFetch = null;
    this.originalGlobalFetch = null;
  }

  /**
   * Initialize the mock API handler by intercepting fetch calls
   */
  initialize() {
    if (this.initialized || typeof window === 'undefined') return;
    
    logger.info('[MockAPI] Initializing mock API handler for development');
    
    // Store original fetch function before any interception
    this.originalFetch = window.fetch;
    
    // Mock API endpoints
    this.mockEndpoint('/api/auth/verify-tenant', this.handleVerifyTenant);
    this.mockEndpoint('/api/tenant/current', this.handleGetCurrentTenant);
    this.mockEndpoint('/api/tenant/exists', this.handleTenantExists);
    this.mockEndpoint('/api/tenant/check-email', this.handleCheckEmail);
    
    // Bind the interceptor to this instance to maintain correct context
    const boundInterceptor = this.fetchInterceptor.bind(this);
    
    // Override window.fetch
    window.fetch = boundInterceptor;
    
    this.initialized = true;
    logger.info('[MockAPI] Mock API handler initialized');
  }

  /**
   * Register a mock endpoint
   */
  mockEndpoint(path, handler) {
    this.mocks[path] = handler;
  }

  /**
   * Intercept fetch calls and handle mocked endpoints
   */
  async fetchInterceptor(url, options = {}) {
    // Skip Next.js internal fetches to avoid breaking RSC
    if (url && (
      url.toString().includes('/_next/') || 
      url.toString().includes('/__next') ||
      url.toString().includes('/_rsc')
    )) {
      // Use original fetch for Next.js internal calls
      return this.originalFetch.apply(window, [url, options]);
    }
    
    // Process the URL to get the path
    let path;
    try {
      // Handle both URL objects and strings
      if (typeof url === 'object' && url.pathname) {
        path = url.pathname;
      } else {
        const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        path = urlObj.pathname;
      }
    } catch (e) {
      path = String(url);
    }
    
    // Check if this is a mocked endpoint
    if (this.mocks[path]) {
      try {
        logger.debug(`[MockAPI] Intercepting request to ${path}`);
        
        // Parse request body if present
        let body = null;
        if (options.body) {
          try {
            body = JSON.parse(options.body);
          } catch (e) {
            body = options.body;
          }
        }
        
        // Call the mock handler
        const mockResponse = await this.mocks[path](body, options);
        
        // Return a Response object
        return new Response(JSON.stringify(mockResponse.body), {
          status: mockResponse.status || 200,
          headers: {
            'Content-Type': 'application/json',
            ...mockResponse.headers
          }
        });
      } catch (error) {
        logger.error(`[MockAPI] Error in mock handler for ${path}:`, error);
        return new Response(JSON.stringify({ error: 'Mock API error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // For non-mocked endpoints, use the original fetch implementation
    const originalFetch = this.originalFetch;
    
    if (!originalFetch) {
      logger.error('[MockAPI] No original fetch available');
      return new Response(JSON.stringify({ error: 'No original fetch available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Use Function.prototype.apply to ensure correct context
    return originalFetch.apply(window, [url, options]);
  }

  /**
   * Handle verify-tenant endpoint
   */
  async handleVerifyTenant(body) {
    // Extract values from request
    const tenantId = body?.tenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    const userId = body?.userId || 'mock-user-id';
    
    logger.info('[MockAPI] Handling verify-tenant request', { tenantId, userId });
    
    return {
      status: 200,
      body: {
        success: true,
        message: 'Tenant verified successfully (mocked)',
        tenantId: tenantId, 
        correctTenantId: tenantId,
        schemaName: `tenant_${tenantId.replace(/-/g, '_')}`,
        source: 'mock'
      }
    };
  }

  /**
   * Handle get-current-tenant endpoint
   */
  async handleGetCurrentTenant() {
    const tenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    logger.info('[MockAPI] Handling get-current-tenant request');
    
    return {
      status: 200,
      body: {
        tenantId: tenantId,
        schemaName: `tenant_${tenantId.replace(/-/g, '_')}`,
        settings: {
          onboarded: true,
          setupCompleted: true
        }
      }
    };
  }

  /**
   * Handle tenant-exists endpoint
   */
  async handleTenantExists(body) {
    const tenantId = body?.tenantId || '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    logger.info('[MockAPI] Handling tenant-exists request', { tenantId });
    
    return {
      status: 200,
      body: {
        exists: true,
        tenantId: tenantId,
        correctTenantId: tenantId
      }
    };
  }

  /**
   * Handle check-email endpoint
   */
  async handleCheckEmail(body) {
    const email = body?.email || '';
    const tenantId = '18609ed2-1a46-4d50-bc4e-483d6e3405ff';
    
    logger.info('[MockAPI] Handling check-email request', { email });
    
    return {
      status: 200,
      body: {
        email: email,
        tenantId: tenantId,
        found: true
      }
    };
  }
}

// Create singleton instance
export const mockApiHandler = new MockApiHandler();

// Auto-initialize if in development
if (process.env.NODE_ENV === 'development') {
  // Mock API initialization disabled - using production mode
} 