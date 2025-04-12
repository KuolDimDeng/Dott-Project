import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getCurrentUser, fetchUserAttributes } from '@/utils/serverAuth';
import { logger } from '@/utils/logger';

// Postgres connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000
});

/**
 * GET /api/user/me
 * 
 * Fetches the current user's profile data from multiple sources:
 * 1. Auth session (Cognito)
 * 2. Database 
 * 3. Cookies as fallback
 */
export async function GET(request) {
  let client;
  try {
    // Step 1: Try to get user data from auth session
    const user = await getCurrentUser(request);
    
    // Get tenant ID from request or cookie
    const cookies = request.cookies;
    const tenantId = 
      request.headers.get('x-tenant-id') || 
      cookies.get('tenantId')?.value || 
      cookies.get('businessid')?.value;
    
    // Get the user's email from cookies
    const email = cookies.get('email')?.value || cookies.get('userEmail')?.value || '';
    
    // Determine user role based on available data
    const determineUserRole = () => {
      // Check if user has a custom role attribute
      if (user?.['custom:role']) {
        return user['custom:role'];
      }
      
      // Check cookies for role information
      const roleCookie = cookies.get('userRole')?.value || cookies.get('role')?.value;
      if (roleCookie) {
        return roleCookie;
      }
      
      // Default role is 'client' instead of generic 'user'
      return 'client';
    };
    
    // Collect all sources of user data
    let userData = {
      id: user?.sub || user?.id,
      email: email,
      tenantId: tenantId,
      role: determineUserRole(),
      firstName: user?.firstName || user?.given_name || '',
      lastName: user?.lastName || user?.family_name || '',
      name: user?.name || email,
      fullName: '',
    };
    
    // Set fullName based on available first/last name
    if (userData.firstName || userData.lastName) {
      userData.fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }
    
    // If we have a tenantId, try to get additional user data from the database
    if (tenantId) {
      try {
        client = await pool.connect();
        
        // Get business info
        const businessResult = await client.query(
          `SELECT name, business_type FROM users_business WHERE id = $1 LIMIT 1`,
          [tenantId]
        );
        
        if (businessResult.rows.length > 0) {
          userData.businessName = businessResult.rows[0].name;
          userData.businessType = businessResult.rows[0].business_type;
        }
        
        // Get user preferences
        const prefsResult = await client.query(
          `SELECT preferences FROM users_preferences WHERE user_id = $1 LIMIT 1`,
          [userData.id]
        );
        
        if (prefsResult.rows.length > 0) {
          userData.preferences = prefsResult.rows[0].preferences || { theme: 'light', notificationsEnabled: true };
        } else {
          userData.preferences = { theme: 'light', notificationsEnabled: true };
        }
        
        // Get subscription info
        const subResult = await client.query(
          `SELECT subscription_type, onboarding_status, setup_complete FROM users_subscription WHERE tenant_id = $1 LIMIT 1`,
          [tenantId]
        );
        
        if (subResult.rows.length > 0) {
          userData.subscription_type = subResult.rows[0].subscription_type || 'free';
          userData.onboardingStatus = subResult.rows[0].onboarding_status || '';
          userData.setupComplete = subResult.rows[0].setup_complete || false;
        } else {
          userData.subscription_type = 'free';
          userData.onboardingStatus = 'complete';
          userData.setupComplete = true;
        }
      } catch (dbError) {
        logger.error('[API] Error fetching user data from database:', dbError);
        // Continue with partial data
      } finally {
        if (client) client.release();
      }
    }
    
    // Try to get Cognito attributes as fallback
    if (!userData.firstName && !userData.lastName) {
      try {
        const attributes = await fetchUserAttributes();
        if (attributes) {
          userData.firstName = attributes.given_name || attributes.firstName || '';
          userData.lastName = attributes.family_name || attributes.lastName || '';
          userData.fullName = [userData.firstName, userData.lastName].filter(Boolean).join(' ');
        }
      } catch (attrError) {
        logger.warn('[API] Error fetching user attributes:', attrError);
      }
    }
    
    // Final fallback for any missing data
    if (!userData.onboardingStatus) {
      userData.onboardingStatus = 'complete';
    }
    if (userData.setupComplete === undefined) {
      userData.setupComplete = true;
    }
    
    // Return the combined user data
    return NextResponse.json(userData);
  } catch (error) {
    logger.error('[API] /api/user/me error:', error);
    
    // Return minimal user data from cookies as fallback
    const cookies = request.cookies;
    const email = cookies.get('email')?.value || cookies.get('userEmail')?.value || '';
    const tenantId = cookies.get('tenantId')?.value || cookies.get('businessid')?.value;
    
    // Extract username from email for better display
    const username = email ? email.split('@')[0] : '';
    const displayName = username ? username.charAt(0).toUpperCase() + username.slice(1) : '';
    
    return NextResponse.json({
      email,
      tenantId,
      role: 'client',
      firstName: displayName,
      lastName: '',
      name: displayName || email,
      fullName: displayName,
      businessName: '',
      fallback: true,
      onboardingStatus: 'complete',
      setupComplete: true,
      subscription_type: 'free',
      preferences: { theme: 'light', notificationsEnabled: true }
    });
  }
} 