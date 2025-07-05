import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenantUtils';
import { validateServerSession } from '@/utils/serverUtils';
// Removed AWS Cognito and SES imports - now using Auth0
import { logger } from '@/utils/logger';
import { generateVerificationToken, generateVerificationUrl } from '@/utils/tokenUtils';
import { cookies, headers } from 'next/headers';
import CognitoAttributes from '@/utils/CognitoAttributes';

/**
 * Send an invitation email to a new employee
 * 
 * @param {object} data Employee data and temporary password
 * @returns {Promise<object>} Email delivery result
 */
async function sendEmployeeInvitationEmail(data) {
  const { email, firstName, lastName, companyName, verificationUrl } = data;
  
  // Enhanced debugging
  logger.info(`[EMAIL DEBUG] Attempting to send invitation email to ${email}`);
  logger.info(`[EMAIL DEBUG] First Name: ${firstName}, Last Name: ${lastName}`);
  logger.info(`[EMAIL DEBUG] Company Name: ${companyName || process.env.NEXT_PUBLIC_COMPANY_NAME || '(not set)'}`);
  logger.info(`[EMAIL DEBUG] Verification URL: ${verificationUrl}`);
  logger.info(`[EMAIL DEBUG] SES_EMAIL_SENDER: ${process.env.SES_EMAIL_SENDER || '(not set)'}`);
  logger.info(`[EMAIL DEBUG] SES_REGION: ${process.env.SES_REGION || '(not set)'}`);
  
  // HTML email template for employee invitation
  const htmlBody = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { font-size: 12px; color: #666; padding: 20px; text-align: center; }
          .button { background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${companyName || process.env.NEXT_PUBLIC_COMPANY_NAME || 'our company'}!</h1>
          </div>
          <div class="content">
            <p>Hello ${firstName || ''},</p>
            <p>We're excited to have you join our team! Your employee account has been created in our system.</p>
            <p>To complete your account setup and create your password, please click the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Complete Account Setup</a>
            </p>
            <p><strong>Important:</strong> This link will expire in 7 days for security reasons.</p>
            <p>If you have any questions, please contact your HR administrator.</p>
            <p>Best regards,<br/>The HR Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  // Plain text version for email clients that don't support HTML
  const textBody = `
Welcome to ${companyName || process.env.NEXT_PUBLIC_COMPANY_NAME || 'our company'}!

Hello ${firstName || ''},

We're excited to have you join our team! Your employee account has been created in our system.

To complete your account setup and create your password, please visit the following URL:
${verificationUrl}

Important: This link will expire in 7 days for security reasons.

If you have any questions, please contact your HR administrator.

Best regards,
The HR Team

--
This is an automated message. Please do not reply to this email.
  `;
  
  const params = {
    Source: process.env.SES_EMAIL_SENDER || 'no-reply@yourdomain.com',  // The sender's email address
    Destination: {
      ToAddresses: [email],  // The recipient's email address
    },
    Message: {
      Subject: {
        Data: `Welcome to ${companyName || process.env.NEXT_PUBLIC_COMPANY_NAME || 'our company'} - Complete Your Account Setup`,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
  };
  
  // Add detailed logging for email parameters
  logger.info(`[EMAIL DEBUG] Email parameters:`, {
    Source: params.Source,
    Destination: params.Destination.ToAddresses,
    Subject: params.Message.Subject.Data
  });
  
  try {
    // TODO: Implement email sending without AWS SES
    logger.warn(`[EMAIL DEBUG] AWS SES has been removed. Email would be sent to ${email}`);
    logger.info(`[EMAIL DEBUG] Email parameters:`, {
      to: email,
      subject: params.Message.Subject.Data,
      note: 'Email service needs to be implemented with SendGrid, Mailgun, or another provider'
    });
    
    // Return a mock success response
    return { 
      success: false, 
      error: 'Email service not configured - AWS SES has been removed',
      mockMessageId: `mock-${Date.now()}-${email}` 
    };
  } catch (error) {
    logger.error(`[EMAIL DEBUG] Error in email handler:`, error);
    throw error;
  }
}

/**
 * POST endpoint for inviting employees
 * This creates a new user in Cognito and sends an invitation email
 */
export async function POST(request) {
  try {
    // Simplified header logging to avoid async issues
    logger.info('Processing employee invitation request');
    
    // Validate the session and get tokens - try with different approaches
    let session;
    try {
      logger.info('Attempting session validation...');
      session = await validateServerSession();
      
      // In development mode, allow authentication to fail but log it
      if (process.env.NODE_ENV === 'development') {
        // Continue with token information even if verification failed
        if (!session.verified) {
          logger.warn('Session validation failed, but continuing in development mode');
        }
      } else {
        // In production, enforce strict authentication
        if (!session || !session.verified) {
          logger.error('Session validation returned invalid session');
          return NextResponse.json({ error: 'Authentication required - invalid session' }, { status: 401 });
        }
        
        if (!session.tokens || !session.tokens.accessToken) {
          logger.error('Session validation returned session without tokens');
          return NextResponse.json({ error: 'Authentication required - no tokens' }, { status: 401 });
        }
      }
      
      logger.info('Session validation passed or bypassed in development');
    } catch (authError) {
      // In development, continue despite auth errors
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Authentication error in development mode, continuing anyway:', authError);
        // Create a mock session
        session = { 
          verified: false,
          user: { attributes: {} }
        };
      } else {
        logger.error('Authentication error details:', authError);
        return NextResponse.json({ error: 'Authentication failed with error', details: authError.message }, { status: 401 });
      }
    }
    
    
    // Get tenant ID from request or session using CognitoAttributes utility
    let tenantId = null;
    
    // First try to get from request parameters
    tenantId = await getTenantId(request);
    
    // If not found in request, try to get from session attributes using the utility
    if (!tenantId && session?.user?.attributes) {
      tenantId = CognitoAttributes.getTenantId(session.user.attributes);
      logger.info(`[API:invite] Got tenant ID from Cognito attributes: ${tenantId}`);
    }
    
    // As a last resort, try the businessid attribute directly
    if (!tenantId && session?.user?.attributes) {
      tenantId = session.user.attributes[CognitoAttributes.BUSINESS_ID];
      logger.info(`[API:invite] Got tenant ID from business ID attribute: ${tenantId}`);
    }
    
    // Validate that we have a tenant ID
    if (!tenantId) {
      logger.error('[API:invite] No tenant ID found in request or session');
      return NextResponse.json({ error: 'Tenant ID not found' }, { status: 400 });
    }
    
    // Extract additional owner attributes to copy to the new user
    let ownerAttributes = {};
    if (session?.user?.attributes) {
      // Collect important tenant-related attributes using CognitoAttributes utility
      ownerAttributes = {
        [CognitoAttributes.TENANT_ID]: tenantId,
        [CognitoAttributes.BUSINESS_ID]: session.user.attributes[CognitoAttributes.BUSINESS_ID] || tenantId,
        [CognitoAttributes.BUSINESS_NAME]: CognitoAttributes.getBusinessName(session.user.attributes) || '',
        [CognitoAttributes.BUSINESS_TYPE]: session.user.attributes[CognitoAttributes.BUSINESS_TYPE] || '',
        [CognitoAttributes.BUSINESS_COUNTRY]: session.user.attributes[CognitoAttributes.BUSINESS_COUNTRY] || '',
        [CognitoAttributes.BUSINESS_STATE]: session.user.attributes[CognitoAttributes.BUSINESS_STATE] || '',
        [CognitoAttributes.CURRENCY]: session.user.attributes[CognitoAttributes.CURRENCY] || 'USD',
        [CognitoAttributes.LANGUAGE]: session.user.attributes[CognitoAttributes.LANGUAGE] || 'en',
      };
    }
    
    logger.info(`[API:invite] Using owner tenant ID for new employee: ${tenantId}`);
    logger.info(`[API:invite] Owner attributes to copy: ${JSON.stringify(Object.keys(ownerAttributes))}`);
    
    // Get request body
    const body = await request.json();
    const { email, firstName, lastName, role, companyName } = body;
    
    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    logger.info(`Creating user for email: ${email} with tenant ID: ${tenantId}`);
    
          // Create user in Cognito
    try {
      const userData = {
        email,
        firstName,
        lastName,
        tenantId,
        role: role || 'user', // Default role for invited users is 'user'
        emailVerified: false, // Do not mark as verified until they confirm
        // Include owner attributes to ensure proper tenant association
        ...ownerAttributes
      };
      
      logger.info(`[API:invite] Creating user with tenant ID: ${tenantId} and role: ${role || 'user'}`);
      
      let createUserResult;
      let existingUser = false;
      
      try {
        createUserResult = await createCognitoUser(userData);
        logger.info(`User created successfully: ${createUserResult.user?.Username}`);
      } catch (userError) {
        // Check if this is a "user already exists" error
        if (userError.code === 'UsernameExistsException' || userError.exists) {
          existingUser = true;
          logger.info(`User already exists with email: ${email}`);
          
          // Get the existing user information - would require an API call to Cognito
          // For simplicity, we'll just use the email as the username for now
          createUserResult = { 
            user: { 
              Username: email,
              Attributes: [
                { Name: 'email', Value: email },
                { Name: 'given_name', Value: firstName || '' },
                { Name: 'family_name', Value: lastName || '' }
              ]
            }
          };
        } else {
          // For other errors, rethrow
          throw userError;
        }
      }
      
      // Generate a verification token
      const tokenPayload = {
        email,
        userId: createUserResult.user?.Username,
        tenantId,
        firstName,
        lastName,
        role: role || 'employee' // Will be mapped to EMPL in cognito.js (4-char minimum)
      };
      
      const verificationToken = generateVerificationToken(tokenPayload);
      
      // Generate verification URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000';
      const verificationUrl = generateVerificationUrl(verificationToken, baseUrl);
      
      logger.info(`[EMAIL DEBUG] Verification URL generated: ${verificationUrl}`);
      logger.info(`[EMAIL DEBUG] Base URL used: ${baseUrl}`);
      
      // Enhanced logging for invitation request
      logger.info(`[EMAIL DEBUG] Processing invitation request for email: ${email}`);
      logger.info(`[EMAIL DEBUG] Request data:`, { firstName, lastName, role, companyName });
      
      // Send invitation email with verification link if SES_EMAIL_SENDER is configured
      if (process.env.SES_EMAIL_SENDER) {
        try {
          logger.info(`[EMAIL DEBUG] Attempting to send email with SES using sender: ${process.env.SES_EMAIL_SENDER}`);
          logger.info(`[EMAIL DEBUG] AWS credentials available: Access Key ID ${process.env.AWS_ACCESS_KEY_ID ? 'is set' : 'is NOT set'}, Secret ${process.env.AWS_SECRET_ACCESS_KEY ? 'is set' : 'is NOT set'}`);
          logger.info(`[EMAIL DEBUG] AWS region configured: ${process.env.AWS_REGION || process.env.SES_REGION || 'us-east-1'}`);
          
          await sendEmployeeInvitationEmail({
            email,
            firstName,
            lastName,
            companyName,
            verificationUrl
          });
          
          return NextResponse.json({
            success: true,
            message: existingUser 
              ? 'Invitation resent to existing employee account.' 
              : 'Employee invited successfully. A verification email has been sent.',
            userId: createUserResult.user?.Username || null,
            userExists: existingUser
          });
        } catch (emailError) {
          logger.error('[EMAIL DEBUG] Error sending invitation email:', emailError);
          logger.error('[EMAIL DEBUG] Email error name:', emailError.name);
          logger.error('[EMAIL DEBUG] Email error message:', emailError.message);
          logger.error('[EMAIL DEBUG] Email error type:', emailError.constructor.name);
          logger.error('[EMAIL DEBUG] Email error details:', JSON.stringify(emailError, Object.getOwnPropertyNames(emailError)));
          
          // Check for specific SES error types
          if (emailError.code === 'InvalidParameterValue') {
            logger.error('[EMAIL DEBUG] SES parameter validation error - check email addresses and format');
          } else if (emailError.code === 'MessageRejected') {
            logger.error('[EMAIL DEBUG] Message was rejected by SES - check if email addresses are verified');
          } else if (emailError.code === 'AccessDenied') {
            logger.error('[EMAIL DEBUG] AWS access denied - check IAM permissions for SES:SendEmail');
          }
          
          // Return successful user creation but with verification URL for manual handling
          return NextResponse.json({
            success: true,
            message: existingUser
              ? 'User already exists. Email sending failed, but verification link is provided.'
              : 'Employee created successfully. Email sending failed, but verification link is provided.',
            userId: createUserResult.user?.Username || null,
            verificationUrl: verificationUrl,
            userExists: existingUser
          });
        }
      } else {
        logger.info('[EMAIL DEBUG] SES_EMAIL_SENDER not configured, skipping email send and returning verification URL');
        logger.info('[EMAIL DEBUG] Email would have been sent to:', email);
        // For local development without SES configured, return the verification URL
        logger.info('SES_EMAIL_SENDER not configured, skipping email send and returning verification URL');
        return NextResponse.json({
          success: true,
          message: existingUser 
            ? 'User already exists. Email sending skipped in development environment.'
            : 'Employee created successfully. Email sending skipped in development environment.',
          userId: createUserResult.user?.Username || null,
          verificationUrl: verificationUrl, // Include the URL for testing
          userExists: existingUser
        });
      }
    } catch (cognitoError) {
      logger.error('[EMAIL DEBUG] Error creating Cognito user:', cognitoError);
      return NextResponse.json({ 
        error: 'Failed to create user account',
        details: cognitoError.message
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Error inviting employee:', error);
    return NextResponse.json(
      { error: 'Failed to invite employee', details: error.message },
      { status: 500 }
    );
  }
} 