import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    // Parse the request body to get the email
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required',
      }, { status: 400 });
    }

    logger.debug('[check-existing-email] Checking if email exists:', { email });

    // In a real implementation, this would query the database
    // For now, we'll simulate this with a local check
    
    // First check if we have an email-to-tenant mapping
    let tenantId = null;
    
    if (typeof window !== 'undefined' && email) {
      try {
        const emailToTenantMap = localStorage.getItem('emailToTenantMap');
        if (emailToTenantMap) {
          const mappings = JSON.parse(emailToTenantMap);
          tenantId = mappings[email.toLowerCase()] || null;
          
          if (tenantId) {
            logger.info('[check-existing-email] Found tenant ID for email:', { 
              email, 
              tenantId 
            });
          }
        }
      } catch (e) {
        logger.error('[check-existing-email] Error reading from localStorage:', { error: e.message });
      }
    }

    // Simulate an API call to backend to check existing users
    const existingUser = await checkEmailInDatabase(email);

    if (existingUser || tenantId) {
      logger.info('[check-existing-email] Email already exists:', { 
        email,
        hasTenant: !!tenantId
      });
      
      return NextResponse.json({
        success: true,
        exists: true,
        tenantId: tenantId,
        message: 'Email already exists in the system. Please sign in instead.',
      });
    }

    logger.info('[check-existing-email] Email is available:', { email });
    return NextResponse.json({
      success: true,
      exists: false,
      message: 'Email is available for registration',
    });
  } catch (error) {
    logger.error('[check-existing-email] Error checking email:', { 
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json({
      success: false,
      message: 'Error checking email',
      error: error.message,
    }, { status: 500 });
  }
}

// Simulated database check - replace this with actual database query in production
async function checkEmailInDatabase(email) {
  try {
    // For demo purposes, we'll use a mock list of existing emails
    // In production, make an actual API call to your backend
    
    // Mock existing emails for testing
    const mockExistingEmails = [
      'test@example.com',
      'user@example.com',
      'admin@example.com'
    ];
    
    // Check localStorage for existing emails from previous sessions
    let existingEmails = [];
    if (typeof window !== 'undefined') {
      try {
        const storedEmails = localStorage.getItem('existingEmails');
        if (storedEmails) {
          existingEmails = JSON.parse(storedEmails);
        }
      } catch (e) {
        logger.error('[check-existing-email] Error reading from localStorage:', { error: e.message });
      }
    }
    
    // Combine mock and stored emails
    const allExistingEmails = [...mockExistingEmails, ...existingEmails];
    
    // Check if email exists in our mock data
    return allExistingEmails.includes(email.toLowerCase());
    
    /* 
    // For production, replace the above with a real API call:
    const response = await fetch('http://your-backend-api/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to check email in database');
    }
    
    const data = await response.json();
    return data.exists;
    */
  } catch (error) {
    logger.error('[check-existing-email] Database check error:', { error: error.message });
    throw error;
  }
} 