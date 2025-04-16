/**
 * Utilities for handling redirects effectively
 */
import { logger } from './logger';
import { getTenantId, isValidUUID } from './tenantUtils';

const REDIRECT_DEBUG_KEY = 'pyfactor_redirect_debug';
const MAX_STORED_REDIRECTS = 10;

/**
 * Safely parse a JSON response, handling HTML responses gracefully
 * 
 * @param {Response} response - The fetch response object
 * @param {Object} options - Options for parsing
 * @param {string} options.context - Context for logging (default: 'unknown')
 * @param {Object} options.defaultValue - Default value if parsing fails (default: {})
 * @param {boolean} options.throwOnHtml - Whether to throw an error on HTML responses (default: false)
 * @param {boolean} options.logFullHtml - Whether to log the full HTML response (default: false)
 * @returns {Promise<Object>} - Parsed JSON object or default value
 */
export const safeParseJson = async (response, options = {}) => {
  const {
    context = 'unknown',
    defaultValue = {},
    throwOnHtml = false,
    logFullHtml = false
  } = options;
  
  try {
    const responseText = await response.text();
    
    // Handle empty responses
    if (!responseText || !responseText.trim()) {
      logger.warn(`[${context}] Empty response received`);
      return defaultValue;
    }
    
    // Check for HTML responses
    if (responseText.trim().startsWith('<!DOCTYPE') || 
        responseText.trim().startsWith('<html') || 
        responseText.includes('<body')) {
      
      const htmlExcerpt = logFullHtml ? responseText : responseText.substring(0, 200);
      if (throwOnHtml) {
        logger.error(`[${context}] Received HTML instead of JSON:`, htmlExcerpt);
        throw new Error('Server returned HTML instead of JSON');
      } else {
        logger.warn(`[${context}] Received HTML instead of JSON:`, htmlExcerpt);
      }
      
      return defaultValue;
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      // Second check for HTML content (might not start with doctype/html but contain HTML tags)
      if (responseText.includes('<!DOCTYPE') || 
          responseText.includes('<html') || 
          responseText.includes('<head') || 
          responseText.includes('<body')) {
        
        if (throwOnHtml) {
          logger.error(`[${context}] Received HTML in response that couldn't be parsed as JSON`);
          throw new Error('Server returned HTML instead of JSON');
        } else {
          logger.warn(`[${context}] Received HTML in response that couldn't be parsed as JSON`);
        }
        
        return defaultValue;
      }
      
      logger.error(`[${context}] Error parsing JSON:`, parseError);
      return defaultValue;
    }
  } catch (error) {
    logger.error(`[${context}] Error reading response:`, error);
    return defaultValue;
  }
};

/**
 * Safely parse JSON from an already read text string
 * @param {string} text - The text to parse
 * @param {Object} options - Options for parsing
 * @param {string} options.context - Context for logging (default: 'unknown')
 * @param {Object} options.defaultValue - Default value if parsing fails (default: {})
 * @param {boolean} options.throwOnHtml - Whether to throw an error on HTML responses (default: false)
 * @param {boolean} options.logFullHtml - Whether to log the full HTML response (default: false)
 * @returns {Object} - Parsed JSON object or default value
 */
export const safeParseJsonText = (text, options = {}) => {
  const {
    context = 'unknown',
    defaultValue = {},
    throwOnHtml = false,
    logFullHtml = false
  } = options;
  
  try {
    // Handle empty responses
    if (!text || !text.trim()) {
      logger.warn(`[${context}] Empty text received`);
      return defaultValue;
    }
    
    // Check for HTML responses
    if (text.trim().startsWith('<!DOCTYPE') || 
        text.trim().startsWith('<html') || 
        text.includes('<body')) {
      
      const htmlExcerpt = logFullHtml ? text : text.substring(0, 200);
      if (throwOnHtml) {
        logger.error(`[${context}] Received HTML instead of JSON:`, htmlExcerpt);
        throw new Error('Text contains HTML instead of JSON');
      } else {
        logger.warn(`[${context}] Received HTML instead of JSON:`, htmlExcerpt);
      }
      
      return defaultValue;
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(text);
    } catch (parseError) {
      // Second check for HTML content (might not start with doctype/html but contain HTML tags)
      if (text.includes('<!DOCTYPE') || 
          text.includes('<html') || 
          text.includes('<head') || 
          text.includes('<body')) {
        
        if (throwOnHtml) {
          logger.error(`[${context}] Received HTML in text that couldn't be parsed as JSON`);
          throw new Error('Text contains HTML instead of JSON');
        } else {
          logger.warn(`[${context}] Received HTML in text that couldn't be parsed as JSON`);
        }
        
        return defaultValue;
      }
      
      logger.error(`[${context}] Error parsing JSON text:`, parseError);
      return defaultValue;
    }
  } catch (error) {
    logger.error(`[${context}] Error parsing text:`, error);
    return defaultValue;
  }
};

/**
 * Store debug information about a redirect for troubleshooting
 * @param {Object} debugInfo Object containing debug information
 * @param {string} debugInfo.source Source page/component initiating the redirect
 * @param {string} debugInfo.destination Target URL for the redirect
 * @param {string} debugInfo.sessionId Current session ID if available
 * @param {Object} debugInfo.additionalData Any additional context data
 */
export const storeRedirectDebugInfo = (debugInfo) => {
  try {
    const timestamp = new Date().toISOString();
    const redirectLog = {
      ...debugInfo,
      timestamp,
      userAgent: navigator.userAgent,
      windowLocation: window.location.href
    };
    
    // Store in localStorage for persistence across sessions
    const existingLogs = JSON.parse(localStorage.getItem('redirectDebugLogs') || '[]');
    existingLogs.push(redirectLog);
    // Keep only the last 10 logs to prevent storage overflow
    const trimmedLogs = existingLogs.slice(-10);
    localStorage.setItem('redirectDebugLogs', JSON.stringify(trimmedLogs));
    
    // Log for immediate debugging
    logger.debug('Redirect debug info:', redirectLog);
  } catch (error) {
    logger.error('Failed to store redirect debug info:', error);
  }
};

/**
 * Force a redirect with multiple fallback methods if one fails
 * @param {string} url URL to redirect to
 * @param {Object} options Additional options
 * @param {boolean} options.preserveForm Whether to use location.assign (true) 
 *                                        or location.replace (false) for the redirect
 * @param {string} options.source Source of the redirect for logging
 * @returns {Promise<void>} Promise that resolves after redirect attempt
 */
export const forceRedirect = async (url, options = {}) => {
  const { preserveForm = false, source = 'unknown' } = options;
  
  // Store debug info about this redirect
  storeRedirectDebugInfo({
    source,
    destination: url,
    sessionId: sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId') || 'unknown',
    additionalData: {
      preserveForm,
      redirectMethod: 'forceRedirect'
    }
  });

  try {
    // Primary redirect method
    if (preserveForm) {
      window.location.assign(url);
    } else {
      window.location.replace(url);
    }
    
    // Return a promise that resolves after a delay to allow the redirect to take effect
    return new Promise((resolve) => {
      // Add fallbacks with timeouts if the primary method doesn't work
      setTimeout(() => {
        logger.warn(`Primary redirect to ${url} may have failed. Trying fallback...`);
        
        try {
          // Fallback 1: Try the other location method
          if (preserveForm) {
            window.location.replace(url);
          } else {
            window.location.assign(url);
          }
          
          // Fallback 2: Try with window.open
          setTimeout(() => {
            logger.warn(`Fallback redirect to ${url} may have failed. Trying window.open...`);
            const newTab = window.open(url, '_self');
            
            // Fallback 3: Last resort, create and click a link
            if (!newTab) {
              logger.warn(`window.open redirect to ${url} failed. Creating and clicking a link...`);
              const link = document.createElement('a');
              link.href = url;
              link.target = '_self';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
            resolve(); // Resolve the promise after all attempts
          }, 1000);
        } catch (fallbackError) {
          logger.error('All redirect methods failed:', fallbackError);
          resolve(); // Resolve even on error
        }
      }, 2000);
    });
  } catch (error) {
    logger.error(`Redirect to ${url} failed:`, error);
    throw error;
  }
};

/**
 * Redirect to the dashboard with tenant ID in the URL
 * 
 * @param {Object} router Next.js router object
 * @param {Object} options Additional options
 * @param {string} options.tenantId Optional tenant ID to use (will attempt to detect if not provided)
 * @param {Object} options.queryParams Query parameters to include in the redirect URL
 * @param {string} options.source Source of the redirect for logging
 * @param {boolean} options.force Whether to use forceRedirect instead of router.push
 * @returns {Promise<void>} Promise that resolves after redirect attempt
 */
export const redirectToDashboard = async (router, options = {}) => {
  const { 
    tenantId: providedTenantId, 
    queryParams = {}, 
    source = 'unknown',
    force = false
  } = options;
  
  // Import necessary functions
  const { getTenantId, isValidUUID } = await import('./tenantUtils');
  
  // Get tenant ID from provided value or stored value
  let tenantId = providedTenantId;
  
  if (!tenantId || !isValidUUID(tenantId)) {
    // Try to get from client storage
    tenantId = getTenantId();
    
    // Validate the tenant ID format
    if (!tenantId || !isValidUUID(tenantId)) {
      logger.warn(`[redirectToDashboard] No valid UUID tenant ID available for dashboard redirect from ${source}`);
      
      // If tenant ID is not a valid UUID, we may need to fix it
      // Check if it's using the old format with tenant_ prefix
      if (tenantId && tenantId.startsWith('tenant_')) {
        logger.warn(`[redirectToDashboard] Found tenant ID with incorrect format: ${tenantId}`);
        
        // Need to convert or get a proper tenant ID
        try {
          // Try to create a proper tenant ID through API
          const response = await fetch('/api/tenant/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.tenantId && isValidUUID(data.tenantId)) {
              logger.info(`[redirectToDashboard] Converted invalid tenant ID to valid UUID: ${data.tenantId}`);
              tenantId = data.tenantId;
            }
          }
        } catch (error) {
          logger.error(`[redirectToDashboard] Error converting invalid tenant ID: ${error.message}`);
        }
      }
      
      // If still no valid tenant ID, redirect to error page or sign-in
      if (!tenantId || !isValidUUID(tenantId)) {
        if (force) {
          return forceRedirect('/auth/signin?error=no_tenant_id', { 
            source: `${source}-fallback`,
            preserveForm: false
          });
        } else {
          return router.push('/auth/signin?error=no_tenant_id');
        }
      }
    }
  }
  
  // Construct query string from params
  const queryString = new URLSearchParams(queryParams).toString();
  const dashboardUrl = `/${tenantId}/dashboard${queryString ? `?${queryString}` : ''}`;
  
  // Store debug info
  storeRedirectDebugInfo({
    source,
    destination: dashboardUrl,
    tenantId,
    additionalData: {
      force,
      queryParams
    }
  });
  
  logger.info(`[redirectToDashboard] Redirecting to tenant-specific dashboard: ${dashboardUrl}`);
  
  // Perform the redirect
  if (force) {
    return forceRedirect(dashboardUrl, { 
      source: `${source}-forced`,
      preserveForm: false
    });
  } else {
    return router.push(dashboardUrl);
  }
};

/**
 * Extract tenant ID from URL path if present
 * @param {string} path URL path to extract from
 * @returns {string|null} Extracted tenant ID or null if not found
 */
export const extractTenantIdFromPath = (path) => {
  if (!path) return null;
  
  // Match tenant ID in various path formats
  const tenantPathRegex = /\/(?:t|tenant|organization)\/([a-zA-Z0-9_-]+)/;
  const match = path.match(tenantPathRegex);
  
  return match ? match[1] : null;
};

/**
 * Create a URL with query parameters for redirection
 * 
 * @param {string} baseUrl - Base URL to redirect to
 * @param {Object} params - Query parameters to add
 * @returns {string} - Complete URL with parameters
 */
export const createRedirectUrl = (baseUrl, params = {}) => {
  const url = new URL(baseUrl, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });
  
  return url.toString();
};

/**
 * Redirect to subscription page with optional parameters
 * 
 * @param {Object} options - Options for the redirect
 * @param {string} options.plan - Plan to select (default: null)
 * @param {string} options.source - Source of redirect for tracking (default: 'unknown')
 * @param {string} options.returnUrl - URL to return to after subscription (default: current URL)
 * @returns {Promise<void>}
 */
export const redirectToSubscription = async (options = {}) => {
  const {
    plan = null,
    source = 'unknown',
    returnUrl = window.location.href
  } = options;
  
  const params = {
    return_to: returnUrl,
    source
  };
  
  if (plan) {
    params.plan = plan;
  }
  
  const subscriptionUrl = createRedirectUrl('/subscription', params);
  await forceRedirect(subscriptionUrl, { source: 'redirectToSubscription' });
};

/**
 * Extract and parse URL parameters related to redirects
 * 
 * @returns {Object} - Object containing parsed redirect parameters
 */
export const getRedirectParams = () => {
  const params = new URLSearchParams(window.location.search);
  
  return {
    returnTo: params.get('return_to') || null,
    source: params.get('source') || null,
    plan: params.get('plan') || null,
    referrer: document.referrer || null
  };
};

/**
 * Get stored redirect debug logs
 * @returns {Array} Array of redirect debug logs
 */
export const getRedirectDebugLogs = () => {
  try {
    return JSON.parse(localStorage.getItem('redirectDebugLogs') || '[]');
  } catch (error) {
    logger.error('Failed to retrieve redirect debug logs:', error);
    return [];
  }
};

/**
 * Clear stored redirect debug logs
 */
export const clearRedirectDebugLogs = () => {
  try {
    localStorage.removeItem('redirectDebugLogs');
    logger.debug('Redirect debug logs cleared');
  } catch (error) {
    logger.error('Failed to clear redirect debug logs:', error);
  }
};

/**
 * Analyze redirect flow and diagnose potential issues
 * 
 * @returns {Object} - Analysis results with diagnostic information
 */
export const analyzeRedirectFlow = () => {
  const history = getRedirectDebugLogs();
  
  if (!history || history.length === 0) {
    return {
      status: 'no_data',
      message: 'No redirect history found',
      recommendations: ['Try performing a redirect first', 'Check if localStorage is enabled']
    };
  }
  
  // Sort by timestamp
  const sortedHistory = [...history].sort((a, b) => {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
  
  // Find the most recent redirect flow
  const lastRedirectStart = sortedHistory.filter(entry => entry.event === 'redirect_start').pop();
  if (!lastRedirectStart) {
    return {
      status: 'incomplete_data',
      message: 'No complete redirect flow found',
      history: sortedHistory.slice(-3),
      recommendations: ['Check for localStorage limitations or corruption']
    };
  }
  
  // Get all events related to the last redirect
  const startTime = new Date(lastRedirectStart.timestamp);
  const relatedEvents = sortedHistory.filter(entry => {
    const entryTime = new Date(entry.timestamp);
    // Include events within 10 seconds of the start event
    return entryTime >= startTime && entryTime <= new Date(startTime.getTime() + 10000);
  });
  
  // Check if we have a successful completion
  const hasSuccess = relatedEvents.some(entry => entry.event === 'redirect_success');
  const hasError = relatedEvents.some(entry => entry.event === 'redirect_error');
  const hasFallbacks = relatedEvents.some(entry => entry.event?.includes('fallback'));
  
  // Diagnose issues
  const issues = [];
  
  if (hasError) {
    issues.push('Redirect encountered explicit errors');
  }
  
  if (hasFallbacks) {
    issues.push('Primary redirect method failed, fallbacks were used');
  }
  
  if (!hasSuccess && !hasError) {
    issues.push('Redirect may not have completed');
  }
  
  // Check browser
  const browser = lastRedirectStart.browser || {};
  const isMobile = (browser.userAgent && /Mobi|Android/i.test(browser.userAgent)) || 
                  (lastRedirectStart.additionalInfo && lastRedirectStart.additionalInfo.isMobile);
  
  // Generate recommendations
  let recommendations = [];
  
  if (issues.length > 0) {
    recommendations = [
      'Ensure JavaScript is enabled',
      'Check for browser extensions blocking redirects',
      'Verify that the destination URL is valid and accessible'
    ];
    
    if (isMobile) {
      recommendations.push('On mobile, try using a different browser or clearing browser cache');
    }
    
    if (hasFallbacks && !hasSuccess) {
      recommendations.push('Consider adding a manual link to the destination as a fallback');
    }
  }
  
  return {
    status: hasSuccess ? 'success' : (hasError ? 'error' : 'incomplete'),
    source: lastRedirectStart.source,
    destination: lastRedirectStart.destination,
    startTime: lastRedirectStart.timestamp,
    duration: relatedEvents.length > 1 ? 
      (new Date(relatedEvents[relatedEvents.length - 1].timestamp) - new Date(lastRedirectStart.timestamp)) : 
      null,
    issues,
    events: relatedEvents,
    browser,
    isMobile,
    recommendations
  };
};

/**
 * Create a debugging report for redirect issues
 * 
 * @returns {string} - HTML report of redirect debugging information
 */
export const createRedirectDebugReport = () => {
  const analysis = analyzeRedirectFlow();
  const history = getRedirectDebugLogs();
  
  // Generate a HTML report
  let report = `
    <style>
      .redirect-report { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      .redirect-report h1 { color: #333; }
      .redirect-report h2 { color: #555; margin-top: 20px; }
      .redirect-report .status { padding: 8px 16px; border-radius: 4px; display: inline-block; margin: 10px 0; }
      .redirect-report .status.success { background: #d4edda; color: #155724; }
      .redirect-report .status.error { background: #f8d7da; color: #721c24; }
      .redirect-report .status.incomplete { background: #fff3cd; color: #856404; }
      .redirect-report .status.no-data { background: #f8f9fa; color: #6c757d; }
      .redirect-report table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .redirect-report th, .redirect-report td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
      .redirect-report th { background-color: #f8f9fa; }
      .redirect-report tr:hover { background-color: #f1f1f1; }
      .redirect-report ul { margin: 10px 0; padding-left: 20px; }
      .redirect-report .code { font-family: monospace; background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
    </style>
    <div class="redirect-report">
      <h1>Redirect Debug Report</h1>
      <div class="status ${analysis.status}">Status: ${analysis.status}</div>
  `;
  
  if (analysis.status === 'no_data') {
    report += `
      <p>No redirect history data found. Possible reasons:</p>
      <ul>
        <li>No redirects have been attempted yet</li>
        <li>LocalStorage is disabled or not supported</li>
        <li>Redirect history was cleared</li>
      </ul>
      <h2>Recommendations</h2>
      <ul>
        ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    `;
  } else if (analysis.status === 'incomplete_data') {
    report += `
      <p>Incomplete redirect flow data found. Limited history available:</p>
      <table>
        <tr>
          <th>Timestamp</th>
          <th>Event</th>
          <th>Details</th>
        </tr>
        ${analysis.history.map(entry => `
          <tr>
            <td>${entry.timestamp}</td>
            <td>${entry.event || 'unknown'}</td>
            <td>${entry.source || ''} → ${entry.destination || ''}</td>
          </tr>
        `).join('')}
      </table>
      <h2>Recommendations</h2>
      <ul>
        ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    `;
  } else {
    report += `
      <h2>Redirect Flow Summary</h2>
      <p><strong>Source:</strong> ${analysis.source || 'Unknown'}</p>
      <p><strong>Destination:</strong> ${analysis.destination || 'Unknown'}</p>
      <p><strong>Start Time:</strong> ${analysis.startTime || 'Unknown'}</p>
      <p><strong>Duration:</strong> ${analysis.duration !== null ? `${analysis.duration}ms` : 'Unknown'}</p>
      
      ${analysis.issues.length > 0 ? `
        <h2>Issues Detected</h2>
        <ul>
          ${analysis.issues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      ` : ''}
      
      <h2>Browser Information</h2>
      <p><strong>User Agent:</strong> <span class="code">${analysis.browser?.userAgent || 'Unknown'}</span></p>
      <p><strong>Platform:</strong> ${analysis.browser?.platform || 'Unknown'}</p>
      <p><strong>Vendor:</strong> ${analysis.browser?.vendor || 'Unknown'}</p>
      <p><strong>Mobile Device:</strong> ${analysis.isMobile ? 'Yes' : 'No'}</p>
      
      <h2>Redirect Events</h2>
      <table>
        <tr>
          <th>Timestamp</th>
          <th>Event</th>
          <th>Details</th>
        </tr>
        ${analysis.events.map(event => `
          <tr>
            <td>${event.timestamp}</td>
            <td>${event.event || 'unknown'}</td>
            <td>${event.fallbackMethod || event.method || ''} ${event.timeSinceStart ? `(+${event.timeSinceStart.toFixed(0)}ms)` : ''}</td>
          </tr>
        `).join('')}
      </table>
      
      ${analysis.recommendations.length > 0 ? `
        <h2>Recommendations</h2>
        <ul>
          ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      ` : ''}
      
      <h2>Complete History</h2>
      <p>Last ${Math.min(history.length, MAX_STORED_REDIRECTS)} redirect events:</p>
      <table>
        <tr>
          <th>Timestamp</th>
          <th>Source</th>
          <th>Destination</th>
          <th>Event</th>
        </tr>
        ${history.map(entry => `
          <tr>
            <td>${entry.timestamp}</td>
            <td>${entry.source || 'unknown'}</td>
            <td>${entry.destination || 'n/a'}</td>
            <td>${entry.event || 'redirect'}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }
  
  report += `
      <h2>Debug Actions</h2>
      <button onclick="window.localStorage.removeItem('redirectDebugLogs'); alert('Redirect history cleared'); window.location.reload();">
        Clear Redirect History
      </button>
    </div>
  `;
  
  return report;
};

// Export a helper to show the debug report in a new window
export const showRedirectDebugReport = () => {
  const reportWindow = window.open('', 'RedirectDebugReport', 'width=900,height=700');
  reportWindow.document.write(createRedirectDebugReport());
  reportWindow.document.title = 'Redirect Debug Report';
  reportWindow.document.close();
  return reportWindow;
};
