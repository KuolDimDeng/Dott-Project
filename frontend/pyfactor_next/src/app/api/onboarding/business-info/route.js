// Server component - no 'use client' directive needed for API routes

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { getServerUser } from '@/utils/serverAuth';

// Simple function to parse cookies from header
const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (e) {
        cookies[name] = value;
      }
    }
  });
  return cookies;
};

/**
 * Handle business information update
 */
export async function POST(request) {
  try {
    // Try to get authenticated user but don't fail if not present
    let user = null;
    try {
      user = await getServerUser(request);
    } catch (authError) {
      logger.warn('[API:business-info] Auth error but continuing:', authError.message);
      // Continue processing without user
    }
    
    // Get request body, handling empty requests gracefully
    let data = {};
    try {
      if (request.body) {
        data = await request.json();
      }
    } catch (parseError) {
      logger.warn('[API:business-info] Error parsing request body:', parseError.message);
      // Continue with empty data object
    }
    
    // Ensure we have at least some data - use defaults if necessary
    const businessName = data.businessName || user?.['custom:businessname'] || '';
    const businessType = data.businessType || user?.['custom:businesstype'] || '';
    const country = data.country || user?.['custom:businesscountry'] || '';
    const legalStructure = data.legalStructure || user?.['custom:legalstructure'] || '';
    
    logger.debug('[API] Business info update request:', {
      userPresent: !!user,
      fields: Object.keys(data),
      businessName,
      businessType
    });

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      message: 'Business information updated successfully',
      nextRoute: '/onboarding/subscription',
      businessInfo: {
        businessName,
        businessType,
        country,
        legalStructure
      }
    });
    
    // Set cookies with business info
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7); // 7 days
    
    // Set cookies for onboarding flow - always use BUSINESS_INFO status
    const onboardingStep = 'subscription';
    const onboardedStatus = 'BUSINESS_INFO';
    
    // Log before setting cookies
    logger.debug('[API] Setting onboarding cookies:', {
      onboardingStep,
      onboardedStatus
    });
    
    response.cookies.set('onboardingStep', onboardingStep, {
      path: '/',
      expires: expiration,
      httpOnly: false,
      sameSite: 'lax'
    });
    
    response.cookies.set('onboardedStatus', onboardedStatus, {
      path: '/',
      expires: expiration,
      httpOnly: false,
      sameSite: 'lax'
    });
    
    // Set business info cookies - ensuring we always set something
    response.cookies.set('businessName', businessName, {
      path: '/',
      expires: expiration,
      httpOnly: false,
      sameSite: 'lax'
    });
    
    response.cookies.set('businessType', businessType, {
      path: '/',
      expires: expiration,
      httpOnly: false,
      sameSite: 'lax'
    });
    
    // Only set these if they have values
    if (country) {
      response.cookies.set('businessCountry', country, {
        path: '/',
        expires: expiration,
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    if (legalStructure) {
      response.cookies.set('legalStructure', legalStructure, {
        path: '/',
        expires: expiration,
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    // Log after setting cookies
    logger.debug('[API] Business-info cookies set successfully', {
      setCookies: {
        onboardingStep,
        onboardedStatus,
        businessName,
        businessType
      }
    });
    
    // Set auth-related cookies if needed for seamless experience
    if (!user) {
      response.cookies.set('authState', 'onboarding-in-progress', {
        path: '/',
        expires: expiration,
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    return response;
  } catch (error) {
    logger.error('[API] Error updating business info:', error);
    
    // Even on error, still try to set the essential cookies
    try {
      const response = NextResponse.json({
        success: false,
        error: 'Failed to update business information',
        message: error.message,
        fallback: true
      }, { status: 500 });
      
      // Set critical cookies even during error to ensure navigation still works
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 7); // 7 days
      
      response.cookies.set('onboardingStep', 'subscription', {
        path: '/',
        expires: expiration,
        httpOnly: false,
        sameSite: 'lax'
      });
      
      response.cookies.set('onboardedStatus', 'BUSINESS_INFO', {
        path: '/',
        expires: expiration,
        httpOnly: false,
        sameSite: 'lax'
      });
      
      logger.debug('[API] Set fallback cookies during error handling');
      
      return response;
    } catch (cookieError) {
      logger.error('[API] Failed to set fallback cookies:', cookieError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to update business information',
        message: error.message
      }, { status: 500 });
    }
  }
}

/**
 * Return the current business info from cookies or server
 */
export async function GET(request) {
  try {
    // Check cookies first
    const cookieStore = cookies();
    const businessName = cookieStore.get('businessName')?.value;
    const businessType = cookieStore.get('businessType')?.value;
    const country = cookieStore.get('businessCountry')?.value;
    const legalStructure = cookieStore.get('legalStructure')?.value;
    const onboardingStep = cookieStore.get('onboardingStep')?.value;
    const onboardedStatus = cookieStore.get('onboardedStatus')?.value;
    
    // Try to get server session as fallback
    let userInfo = null;
    try {
      const user = await getServerUser(request);
      userInfo = user;
    } catch (authError) {
      // Log but continue - use cookies
      logger.warn('[BusinessInfo] Server auth failed, continuing with cookies:', authError.message);
    }
    
    // Return business info
    return NextResponse.json({
      success: true,
      businessInfo: {
        businessName: businessName || (userInfo?.attributes?.['custom:businessname'] || ''),
        businessType: businessType || (userInfo?.attributes?.['custom:businesstype'] || ''),
        country: country || (userInfo?.attributes?.['custom:businesscountry'] || ''),
        legalStructure: legalStructure || (userInfo?.attributes?.['custom:legalstructure'] || '')
      },
      onboarding: {
        step: onboardingStep || 'business-info',
        status: onboardedStatus || 'NOT_STARTED'
      },
      source: businessName ? 'cookies' : (userInfo ? 'server' : 'none')
    });
  } catch (error) {
    logger.error('[BusinessInfo] Error fetching business info:', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch business information',
      message: error.message
    }, { status: 500 });
  }
}