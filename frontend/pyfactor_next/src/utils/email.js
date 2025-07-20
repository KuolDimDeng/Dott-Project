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

/**
 * Send email using the backend Resend integration
 * 
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.htmlContent - HTML content for the email
 * @param {string} params.textContent - Plain text content for the email
 * @param {string} params.replyTo - Reply-to email address
 * @returns {Promise<object>} - Result of the email send operation
 */
export async function sendEmailWithTemplate({ to, subject, htmlContent, textContent, replyTo }) {
  try {
    logger.info('[EMAIL] Sending email via backend Resend integration', {
      to,
      subject,
      hasHtml: !!htmlContent,
      hasText: !!textContent,
      replyTo
    });

    // Call the backend API to send email via Resend
    const response = await fetch('/api/send-email/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        reply_to: replyTo
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      logger.info('[EMAIL] Email sent successfully via Resend', {
        messageId: data.message_id
      });
      
      return {
        success: true,
        messageId: data.message_id
      };
    } else {
      logger.error('[EMAIL] Failed to send email via Resend', {
        error: data.error || 'Unknown error',
        status: response.status
      });
      
      return {
        success: false,
        error: data.error || 'Failed to send email'
      };
    }
  } catch (error) {
    logger.error('[EMAIL] Error sending email via Resend:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
} 