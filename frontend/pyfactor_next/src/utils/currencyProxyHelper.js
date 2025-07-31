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
  
  // Add authentication if provided
  if (cookies) {
    const sessionId = cookies.get('sid')?.value || cookies.get('session_token')?.value;
    
    if (sessionId) {
      // Add Authorization header (primary method)
      headers['Authorization'] = `Session ${sessionId}`;
      
      // Also add cookies as backup
      const cookieHeader = [];
      cookieHeader.push(`sid=${sessionId}`);
      cookieHeader.push(`session_token=${sessionId}`);
      headers['Cookie'] = cookieHeader.join('; ');
      
      console.log(`[Currency Helper] Auth configured with session: ${sessionId.substring(0, 8)}...`);
    } else {
      console.warn('[Currency Helper] No session token found in cookies');
    }
  }
  
  let lastError;
  let attempt = 0;
  
  while (attempt < RETRY_CONFIG.maxRetries) {
    try {
      console.log(`[Currency Helper] Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries} - ${options.method || 'GET'} ${fullUrl}`);
      
      console.log(`[Currency Helper] Fetch options:`, {
        method: options.method || 'GET',
        headers: Object.keys(headers).reduce((acc, key) => {
          acc[key] = key === 'Cookie' ? (headers[key]?.substring(0, 50) + '...') : headers[key];
          return acc;
        }, {}),
        bodyLength: options.body?.length || 0
      });
      
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: AbortSignal.timeout(30000), // 30 second timeout for slower operations
      });
      
      // Log response details
      console.log(`[Currency Helper] Response received:`, {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        url: response.url
      });
      
      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error(`[Currency Helper] ⚠️ Backend returned HTML instead of JSON`);
        const htmlPreview = await response.text();
        console.error(`[Currency Helper] HTML preview (first 500 chars):`, htmlPreview.substring(0, 500));
        throw new Error(`Backend returned HTML error page (status: ${response.status})`);
      }
      
      // For successful responses or client errors, don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // For server errors, log more details and throw to trigger retry
      console.error(`[Currency Helper] Server error response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
      
    } catch (error) {
      lastError = error;
      console.error(`[Currency Helper] Request failed (attempt ${attempt + 1}):`, {
        message: error.message,
        name: error.name,
        cause: error.cause,
        systemError: error.code,
        errno: error.errno,
        syscall: error.syscall
      });
      
      // Log more details for network errors
      if (error.message?.includes('fetch') || error.name === 'TypeError') {
        console.error(`[Currency Helper] Network error details:`, {
          url: fullUrl,
          method: options.method || 'GET',
          backendUrl: getBackendUrl(),
          error: error.toString()
        });
      }
      
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
  console.log('[Currency Helper] Parsing response...');
  
  // First check content type
  const contentType = response.headers.get('content-type');
  console.log('[Currency Helper] Response content-type:', contentType);
  
  const responseText = await response.text();
  console.log('[Currency Helper] Response text length:', responseText.length);
  
  // Check if response is empty
  if (!responseText || responseText.trim() === '') {
    console.error('[Currency Helper] Empty response from backend');
    throw new Error('Empty response from backend');
  }
  
  // Log first 200 chars for debugging
  console.log('[Currency Helper] Response preview:', responseText.substring(0, 200));
  
  // Try to parse as JSON
  try {
    const data = JSON.parse(responseText);
    console.log('[Currency Helper] Successfully parsed JSON:', Object.keys(data));
    return data;
  } catch (parseError) {
    console.error('[Currency Helper] ❌ JSON parse error:', parseError);
    console.error('[Currency Helper] Full response text:', responseText);
    
    // Check if it's an HTML error page
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html') || responseText.includes('<HTML')) {
      console.error('[Currency Helper] ⚠️ Detected HTML response instead of JSON');
      
      // Try to extract error message from HTML
      const titleMatch = responseText.match(/<title>([^<]+)<\/title>/i);
      const h1Match = responseText.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const errorMsg = titleMatch?.[1] || h1Match?.[1] || 'Unknown error';
      
      throw new Error(`Backend error: ${errorMsg} (HTML response)`);
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