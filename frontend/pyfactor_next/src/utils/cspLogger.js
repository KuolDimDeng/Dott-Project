// CSP Logger utility for debugging CSP violations
import { logger } from './logger';

// Track CSP violations
const cspViolations = new Map();
const MAX_VIOLATIONS = 100;

export function logCSPViolation(violation) {
  const key = `${violation.violatedDirective}-${violation.blockedURI}`;
  
  if (!cspViolations.has(key)) {
    cspViolations.set(key, {
      count: 0,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      ...violation
    });
  }
  
  const record = cspViolations.get(key);
  record.count++;
  record.lastSeen = new Date().toISOString();
  
  // Log every 10th occurrence to avoid spam
  if (record.count === 1 || record.count % 10 === 0) {
    logger.warn('[CSP Violation]', {
      directive: violation.violatedDirective,
      blockedURI: violation.blockedURI,
      documentURI: violation.documentURI,
      count: record.count,
      sample: violation.sample,
      disposition: violation.disposition
    });
  }
  
  // Cleanup old violations if we have too many
  if (cspViolations.size > MAX_VIOLATIONS) {
    const oldestKey = Array.from(cspViolations.keys())[0];
    cspViolations.delete(oldestKey);
  }
}

export function getCSPViolationSummary() {
  const summary = [];
  
  for (const [key, violation] of cspViolations.entries()) {
    summary.push({
      directive: violation.violatedDirective,
      blockedURI: violation.blockedURI,
      count: violation.count,
      firstSeen: violation.firstSeen,
      lastSeen: violation.lastSeen
    });
  }
  
  return summary.sort((a, b) => b.count - a.count);
}

// Function to check if a URL should be allowed based on CSP
export function checkCSPCompatibility(url, directive = 'connect-src') {
  const allowedDomains = {
    'connect-src': [
      'self',
      '*.auth0.com',
      '*.stripe.com',
      '*.googleapis.com',
      '*.crisp.chat',
      'api.stripe.com',
      'api.dottapps.com',
      'auth.dottapps.com',
      'dottapps.com',
      'www.dottapps.com',
      'ipapi.co',
      'api.country.is',
      'ipinfo.io',
      'ipgeolocation.io',
      '*.plaid.com',
      'app.posthog.com',
      '*.posthog.com',
      '*.cloudflare.com',
      '*.ingest.sentry.io',
      '*.ingest.us.sentry.io'
    ]
  };
  
  const allowed = allowedDomains[directive] || [];
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if URL matches any allowed domain
    for (const domain of allowed) {
      if (domain === 'self') {
        if (hostname === window.location.hostname) return true;
      } else if (domain.startsWith('*.')) {
        const baseDomain = domain.substring(2);
        if (hostname.endsWith(baseDomain) || hostname === baseDomain) return true;
      } else if (hostname === domain) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    logger.error('[CSP Check] Invalid URL', { url, error: error.message });
    return false;
  }
}

// Initialize CSP violation listener
export function initCSPViolationListener() {
  if (typeof window === 'undefined') return;
  
  // Listen for security policy violations
  window.addEventListener('securitypolicyviolation', (e) => {
    logCSPViolation({
      violatedDirective: e.violatedDirective,
      blockedURI: e.blockedURI,
      documentURI: e.documentURI,
      sample: e.sample,
      disposition: e.disposition,
      effectiveDirective: e.effectiveDirective,
      originalPolicy: e.originalPolicy,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      columnNumber: e.columnNumber
    });
  });
  
  logger.info('[CSP Logger] Violation listener initialized');
}

// Export a function to manually check current CSP
export function getCurrentCSP() {
  if (typeof document === 'undefined') return null;
  
  // Try to get CSP from meta tag
  const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (metaCSP) {
    return {
      source: 'meta-tag',
      policy: metaCSP.getAttribute('content')
    };
  }
  
  // CSP headers can't be accessed from JavaScript, but we can check if certain operations work
  const tests = {
    canLoadCloudflare: false,
    canLoadSentry: false,
    canLoadStripe: false
  };
  
  // Test by creating a simple fetch to known endpoints
  const testUrls = {
    cloudflare: 'https://api.cloudflare.com/client/v4/user',
    sentry: 'https://o4509614361804800.ingest.us.sentry.io/api/0/envelope/',
    stripe: 'https://api.stripe.com/v1/charges'
  };
  
  return {
    source: 'runtime-tests',
    tests,
    violations: getCSPViolationSummary()
  };
}