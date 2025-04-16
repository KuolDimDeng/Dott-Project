import { NextResponse } from 'next/server';
import { testSESConfiguration, verifySenderEmail } from '@/utils/email';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Test email configuration and optionally send a test email
 */
export async function POST(request) {
  // Validate authentication (require admin privileges)
  const sessionData = await validateServerSession(request);
  
  if (!sessionData.authenticated) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401, headers: corsHeaders }
    );
  }
  
  // Admin-only check
  if (sessionData.userRole !== 'ADMIN' && sessionData.userRole !== 'OWNER' && process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'Admin privileges required' },
      { status: 403, headers: corsHeaders }
    );
  }
  
  // Parse request body
  try {
    const body = await request.json();
    const { testEmail, action = 'check' } = body;
    
    logger.info(`[TEST EMAIL API] Processing ${action} request`, { testEmail });
    
    // Verify sender email configuration
    const senderResult = await verifySenderEmail();
    
    // If sender email is not properly configured, return early
    if (!senderResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sender email configuration issue',
          details: senderResult.error,
          diagnostics: {
            ...senderResult.diagnostics,
            action,
            testEmailProvided: !!testEmail
          }
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Check if we should send a test email
    if (action === 'send' && testEmail) {
      logger.info(`[TEST EMAIL API] Sending test email to ${testEmail}`);
      const testResult = await testSESConfiguration(testEmail);
      
      return NextResponse.json(
        {
          success: testResult.success,
          message: testResult.success 
            ? `Test email sent successfully to ${testEmail}` 
            : `Failed to send test email: ${testResult.error}`,
          diagnostics: testResult.diagnostics,
          recommendation: testResult.recommendation || null
        },
        { status: testResult.success ? 200 : 500, headers: corsHeaders }
      );
    }
    
    // Just return configuration check
    return NextResponse.json(
      {
        success: true,
        message: 'Email configuration check completed',
        sender: senderResult,
        diagnostics: {
          sesEmailSender: process.env.SES_EMAIL_SENDER || '(not set)',
          sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
          hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          envNodeEnv: process.env.NODE_ENV || 'development'
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    logger.error('[TEST EMAIL API] Error processing request:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process test email request',
        details: error.message
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 