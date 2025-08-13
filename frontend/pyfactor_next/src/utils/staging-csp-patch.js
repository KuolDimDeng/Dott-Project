// Staging-specific CSP adjustments
export function getStaging CSPAdjustments(csp) {
  // Remove integrity checks for Cloudflare Analytics in staging
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging') {
    // Allow Cloudflare Analytics without hash validation
    csp = csp.replace(
      "'unsafe-inline'",
      "'unsafe-inline' 'unsafe-hashes'"
    );
  }
  return csp;
}
