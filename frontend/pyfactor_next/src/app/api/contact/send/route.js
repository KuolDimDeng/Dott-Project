import { NextResponse } from 'next/server';
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
    
    // Send directly to backend contact form endpoint (public, no authentication required)
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${API_BASE_URL}/api/contact-form/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        company,
        phone,
        subject,
        message
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      logger.info('[CONTACT FORM] Contact form submitted successfully via backend');
      
      return NextResponse.json(
        { 
          success: true, 
          message: data.message || 'Your message has been sent successfully. We\'ll get back to you soon!' 
        },
        { status: 200, headers: corsHeaders }
      );
    } else {
      logger.error('[CONTACT FORM] Backend contact form submission failed', {
        status: response.status,
        error: data.error || 'Unknown error'
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: data.error || 'Failed to send your message. Please try again later or email us directly at support@dottapps.com' 
        },
        { status: response.status || 500, headers: corsHeaders }
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