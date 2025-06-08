/**
 * Email utility functions
 * 
 * Provides helper functions for email operations and diagnostics
 */

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

  // TODO: Implement email sending without AWS SES
  logger.warn('[EMAIL TEST] AWS SES has been removed. Email functionality needs to be reimplemented.');
  
  return {
    success: false,
    error: 'Email service not configured - AWS SES has been removed',
    diagnostics: {
      sesEmailSender: process.env.SES_EMAIL_SENDER || '(not set)',
      sesRegion: process.env.SES_REGION || process.env.AWS_REGION || 'us-east-1',
      hasAccessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      emailSent: false,
      recipient: testEmail,
      note: 'AWS SES has been removed from the codebase. Consider using SendGrid, Mailgun, or another email service.'
    }
  };
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