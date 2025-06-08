/**
 * Email utility functions
 * 
 * Provides helper functions for email operations and diagnostics
 */

import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { logger } from './logger';

/**
 * Tests the AWS SES configuration by sending a test email
 * 
 * @param {string} testEmail - The email address to send the test to
 * @returns {Promise<object>} - Result of the test
 */
export async function testSESConfiguration(testEmail) {
  if (!testEmail) {
    return { 
      success: false, 
      error: 'Missing test email address',
      diagnostics: {
        sesEmailSender: process.env.SES_EMAIL_SENDER || '(not set)',
        sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
        hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
      }
    };
  }

  // Create SES client with detailed logging
  logger.info('[EMAIL TEST] Creating SES client with the following configuration:');
  logger.info('[EMAIL TEST] SES Region:', process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1');
  logger.info('[EMAIL TEST] SES Email Sender:', process.env.SES_EMAIL_SENDER || '(not set)');
  logger.info('[EMAIL TEST] AWS Access Key ID available:', process.env.AWS_ACCESS_KEY_ID ? 'Yes' : 'No');
  logger.info('[EMAIL TEST] AWS Secret Access Key available:', process.env.AWS_SECRET_ACCESS_KEY ? 'Yes' : 'No');

  const sesClient = new SESClient({
    region: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  // Prepare simple text email
  const emailParams = {
    Source: process.env.SES_EMAIL_SENDER || 'no-reply@yourdomain.com',
    Destination: {
      ToAddresses: [testEmail],
    },
    Message: {
      Subject: {
        Data: 'SES Configuration Test',
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: `This is a test email to verify your AWS SES configuration.
           
Time sent: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
SES Region: ${process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1'}
Sender: ${process.env.SES_EMAIL_SENDER || 'no-reply@yourdomain.com'}
           
If you're receiving this email, your SES configuration is working correctly.`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    logger.info(`[EMAIL TEST] Sending test email to ${testEmail}`);
    const command = new SendEmailCommand(emailParams);
    const result = await sesClient.send(command);
    logger.info(`[EMAIL TEST] Email sent successfully with message ID: ${result.MessageId}`);
    
    return {
      success: true,
      messageId: result.MessageId,
      diagnostics: {
        sesEmailSender: process.env.SES_EMAIL_SENDER || '(not set)',
        sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
        hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        emailSent: true,
        recipient: testEmail
      }
    };
  } catch (error) {
    logger.error(`[EMAIL TEST] Error sending test email to ${testEmail}:`, error);
    logger.error(`[EMAIL TEST] Error name: ${error.name}`);
    logger.error(`[EMAIL TEST] Error message: ${error.message}`);
    
    // Check for common SES errors
    let errorType = 'unknown';
    let recommendation = '';
    
    if (error.name === 'MessageRejected') {
      errorType = 'message_rejected';
      recommendation = 'The email was rejected. Verify the sender email is verified in SES.';
    } else if (error.name === 'MailFromDomainNotVerifiedException') {
      errorType = 'domain_not_verified';
      recommendation = 'The sending domain is not verified in SES. Verify it in the AWS SES console.';
    } else if (error.name === 'ConfigurationSetDoesNotExistException') {
      errorType = 'config_set_missing';
      recommendation = 'The SES configuration set does not exist.';
    } else if (error.name === 'AccountSendingPausedException') {
      errorType = 'account_paused';
      recommendation = 'Your AWS account sending is paused. Check your AWS SES console.';
    } else if (error.name === 'ResourceNotFoundException') {
      errorType = 'resource_not_found';
      recommendation = 'SES resource not found. Ensure the sender email is verified in SES.';
    } else if (error.name === 'InvalidParameterValue') {
      errorType = 'invalid_parameter';
      recommendation = 'Check if the email addresses are valid and properly formatted.';
    } else if (error.name === 'AccessDenied' || error.name === 'AccessDeniedException') {
      errorType = 'access_denied';
      recommendation = 'IAM permissions are insufficient. The user needs ses:SendEmail permission.';
    }
    
    return {
      success: false,
      error: error.message,
      errorType,
      recommendation,
      diagnostics: {
        sesEmailSender: process.env.SES_EMAIL_SENDER || '(not set)',
        sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
        hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        emailSent: false,
        recipient: testEmail,
        errorName: error.name,
        errorMessage: error.message
      }
    };
  }
}

/**
 * Verify that a sender email is properly configured in SES
 * 
 * @param {string} senderEmail - The sender email to check
 * @returns {Promise<object>} - Result of the verification check
 */
export async function verifySenderEmail(senderEmail = process.env.SES_EMAIL_SENDER) {
  if (!senderEmail) {
    return {
      success: false,
      error: 'No sender email provided and SES_EMAIL_SENDER not set',
      diagnostics: {
        sesEmailSender: process.env.SES_EMAIL_SENDER || '(not set)',
        sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1'
      }
    };
  }

  logger.info(`[EMAIL TEST] Checking if sender email ${senderEmail} is properly configured`);
  
  // Check if email is in a proper format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(senderEmail)) {
    return {
      success: false,
      error: 'Sender email is not in a valid format',
      diagnostics: {
        senderEmail,
        isValidFormat: false
      }
    };
  }

  // For a more comprehensive check, we'd need to call the SES API
  // to check if the email is verified, but that would require additional permissions
  return {
    success: true,
    message: `Sender email ${senderEmail} is in valid format. To complete verification, ensure it's verified in AWS SES.`,
    diagnostics: {
      senderEmail,
      isValidFormat: true,
      sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1'
    }
  };
} 