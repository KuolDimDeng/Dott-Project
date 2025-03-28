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
    const data = await request.json();
    
    logger.debug('[API] Business info update request:', {
      fields: Object.keys(data),
      businessName: data.businessName,
      businessType: data.businessType,
      _onboardingStatus: data._onboardingStatus,
      _onboardingStep: data._onboardingStep
    });

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      message: 'Business information updated successfully',
      nextRoute: '/onboarding/subscription',
      businessInfo: {
        businessName: data.businessName,
        businessType: data.businessType,
        country: data.country,
        legalStructure: data.legalStructure
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
    
    // Set business info cookies
    if (data.businessName) {
      response.cookies.set('businessName', data.businessName, {
        path: '/',
        expires: expiration,
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    if (data.businessType) {
      response.cookies.set('businessType', data.businessType, {
        path: '/',
        expires: expiration,
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    if (data.country) {
      response.cookies.set('businessCountry', data.country, {
        path: '/',
        expires: expiration,
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    
    if (data.legalStructure) {
      response.cookies.set('legalStructure', data.legalStructure, {
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
        businessName: data.businessName,
        businessType: data.businessType
      }
    });
    
    return response;
  } catch (error) {
    logger.error('[API] Error updating business info:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update business information',
      message: error.message
    }, { status: 500 });
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