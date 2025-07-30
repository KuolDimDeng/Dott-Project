/**
 * Currency Proxy Helper
 * Centralized utility for making currency API calls with robust error handling
 */

import { NextResponse } from 'next/server';

// Backend URL configuration with fallbacks
export const getBackendUrl = () => {
  const url = process.env.BACKEND_URL || 
              process.env.NEXT_PUBLIC_BACKEND_URL || 
              'https://api.dottapps.com';
  console.log(`[Currency Helper] Using backend URL: ${url}`);
  return url;
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  backoffMultiplier: 2,
};

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Make a request to the backend with retry logic
 * @param {string} endpoint - The API endpoint (e.g., '/api/currency/test-public/')
 * @param {object} options - Fetch options
 * @param {object} cookies - Cookie object from Next.js
 * @returns {Promise<Response>} - The fetch response
 */
export async function makeBackendRequest(endpoint, options = {}, cookies = null) {
  const backendUrl = getBackendUrl();
  const fullUrl = `${backendUrl}${endpoint}`;
  
  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Next.js Currency Proxy',
    ...options.headers,
  };
  
  // Add cookies if provided
  if (cookies) {
    const cookieHeader = [];
    const sessionId = cookies.get('sid')?.value;
    const sessionToken = cookies.get('session_token')?.value;
    
    if (sessionId) cookieHeader.push(`sid=${sessionId}`);
    if (sessionToken) cookieHeader.push(`session_token=${sessionToken}`);
    
    if (cookieHeader.length > 0) {
      headers['Cookie'] = cookieHeader.join('; ');
    }
  }
  
  let lastError;
  let attempt = 0;
  
  while (attempt < RETRY_CONFIG.maxRetries) {
    try {
      console.log(`[Currency Helper] Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} - ${options.method || 'GET'} ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      // Log response details
      console.log(`[Currency Helper] Response status: ${response.status} ${response.statusText}`);
      
      // For successful responses or client errors, don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // For server errors, throw to trigger retry
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
      
    } catch (error) {
      lastError = error;
      console.error(`[Currency Helper] Request failed (attempt ${attempt + 1}):`, error.message);
      
      // Don't retry on client errors or abort
      if (error.name === 'AbortError' || (error.response && error.response.status >= 400 && error.response.status < 500)) {
        throw error;
      }
      
      attempt++;
      
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
        console.log(`[Currency Helper] Retrying in ${delay}ms...`);
        await wait(delay);
      }
    }
  }
  
  throw new Error(`Failed after ${RETRY_CONFIG.maxRetries} attempts: ${lastError.message}`);
}

/**
 * Parse response and handle errors
 * @param {Response} response - The fetch response
 * @returns {Promise<object>} - Parsed JSON data
 */
export async function parseResponse(response) {
  const responseText = await response.text();
  
  // Check if response is empty
  if (!responseText || responseText.trim() === '') {
    throw new Error('Empty response from backend');
  }
  
  // Try to parse as JSON
  try {
    const data = JSON.parse(responseText);
    return data;
  } catch (parseError) {
    console.error('[Currency Helper] JSON parse error:', parseError);
    console.error('[Currency Helper] Response text:', responseText.substring(0, 500));
    
    // Check if it's an HTML error page
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      throw new Error('Backend returned HTML error page instead of JSON');
    }
    
    throw new Error(`Invalid JSON response: ${parseError.message}`);
  }
}

/**
 * Create a standardized error response
 * @param {Error} error - The error object
 * @param {number} status - HTTP status code
 * @returns {NextResponse} - Next.js response object
 */
export function createErrorResponse(error, status = 500) {
  console.error('[Currency Helper] Creating error response:', error);
  
  const errorResponse = {
    success: false,
    error: error.message || 'Unknown error',
    errorType: error.constructor.name,
    timestamp: new Date().toISOString(),
  };
  
  // Add debug info in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      stack: error.stack,
      ...error,
    };
  }
  
  return NextResponse.json(errorResponse, { status });
}

/**
 * Create a successful response
 * @param {object} data - The response data
 * @param {number} status - HTTP status code
 * @returns {NextResponse} - Next.js response object
 */
export function createSuccessResponse(data, status = 200) {
  return NextResponse.json(data, { status });
}