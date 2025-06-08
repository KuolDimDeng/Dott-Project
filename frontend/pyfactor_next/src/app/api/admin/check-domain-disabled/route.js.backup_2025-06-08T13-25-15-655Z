import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// List of domains that are disabled/blocked
const DISABLED_DOMAINS = [
  'example.com',
  'test.com',
  'mailinator.com',
  'tempmail.com',
  'throwawaymail.com'
  // Add any other domains that should be blocked
];

/**
 * Check if an email domain is disabled
 */
export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Extract domain from email
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (!domain) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    logger.info(`[API] Checking if domain is disabled: ${domain}`);
    
    // Check if domain is in the disabled list
    const isDisabled = DISABLED_DOMAINS.includes(domain);
    
    // Return result
    return NextResponse.json({ 
      isDisabled,
      domain
    });
  } catch (error) {
    logger.error('[API] Error checking domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Support for HEAD requests to check if this endpoint exists
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
} 