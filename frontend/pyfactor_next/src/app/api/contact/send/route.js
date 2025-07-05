import { NextResponse } from 'next/server';
import { sendEmailWithTemplate } from '@/utils/email';
import { logger } from '@/utils/logger';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Handle contact form submissions
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, company, phone, message, subject } = body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, email, and message are required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email address format' 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    logger.info('[CONTACT FORM] Processing submission', {
      from: email,
      subject: subject || 'general'
    });
    
    // Format the email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
          ${company ? `<p style="margin: 10px 0;"><strong>Company:</strong> ${company}</p>` : ''}
          ${phone ? `<p style="margin: 10px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h3 style="color: #333; margin-top: 0;">Message:</h3>
          <p style="white-space: pre-wrap; color: #555;">${message}</p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="color: #999; font-size: 12px;">
          This message was sent from the contact form on dottapps.com
        </p>
      </div>
    `;
    
    const textContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${company ? `Company: ${company}\n` : ''}
${phone ? `Phone: ${phone}\n` : ''}
Subject: ${subject || 'General Inquiry'}

Message:
${message}

---
This message was sent from the contact form on dottapps.com
    `;
    
    // Send the email
    const result = await sendEmailWithTemplate({
      to: 'support@dottapps.com',
      subject: `[Contact Form] ${subject || 'General Inquiry'} - From ${name}`,
      htmlContent,
      textContent,
      replyTo: email
    });
    
    if (result.success) {
      logger.info('[CONTACT FORM] Email sent successfully', {
        messageId: result.messageId
      });
      
      // Send auto-reply to the user
      const autoReplyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for contacting Dott!</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Dear ${name},
          </p>
          
          <p style="color: #555; line-height: 1.6;">
            We've received your message and appreciate you taking the time to reach out to us. 
            Our support team will review your inquiry and get back to you as soon as possible, 
            typically within 24-48 hours.
          </p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #666;"><strong>Your submission details:</strong></p>
            <p style="margin: 5px 0; color: #666;">Subject: ${subject || 'General Inquiry'}</p>
            <p style="margin: 5px 0; color: #666;">Submitted on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            If you have any urgent matters, please don't hesitate to follow up with us at 
            <a href="mailto:support@dottapps.com" style="color: #0066cc;">support@dottapps.com</a>.
          </p>
          
          <p style="color: #555; line-height: 1.6;">
            Best regards,<br>
            The Dott Support Team
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #999; font-size: 12px;">
            This is an automated response. Please do not reply directly to this email.
          </p>
        </div>
      `;
      
      const autoReplyText = `
Thank you for contacting Dott!

Dear ${name},

We've received your message and appreciate you taking the time to reach out to us. 
Our support team will review your inquiry and get back to you as soon as possible, 
typically within 24-48 hours.

Your submission details:
Subject: ${subject || 'General Inquiry'}
Submitted on: ${new Date().toLocaleDateString()}

If you have any urgent matters, please don't hesitate to follow up with us at 
support@dottapps.com.

Best regards,
The Dott Support Team

---
This is an automated response. Please do not reply directly to this email.
      `;
      
      // Send auto-reply (non-blocking)
      sendEmailWithTemplate({
        to: email,
        subject: 'Thank you for contacting Dott - We\'ve received your message',
        htmlContent: autoReplyHtml,
        textContent: autoReplyText
      }).catch(err => {
        logger.error('[CONTACT FORM] Failed to send auto-reply', err);
      });
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Your message has been sent successfully. We\'ll get back to you soon!' 
        },
        { status: 200, headers: corsHeaders }
      );
    } else {
      logger.error('[CONTACT FORM] Failed to send email', result.error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send your message. Please try again later or email us directly at support@dottapps.com' 
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    logger.error('[CONTACT FORM] Error processing request:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred. Please try again later.' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}