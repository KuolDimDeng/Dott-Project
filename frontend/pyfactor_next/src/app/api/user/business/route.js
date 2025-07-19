/**
 * Business/Company Information API
 * Provides detailed business information for the current user's tenant
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

export async function GET(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[Business API] Fetching business information, request ${requestId}`);
    
    // Check authentication
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    if (!sidCookie && !sessionTokenCookie) {
      logger.warn(`[Business API] No session found, request ${requestId}`);
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          message: 'Authentication required',
          requestId 
        },
        { status: 401 }
      );
    }
    
    const sessionId = sidCookie?.value || sessionTokenCookie?.value;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    try {
      logger.debug(`[Business API] Getting session data first, request ${requestId}`);
      
      // First get the user's session to get tenant ID
      const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
        headers: {
          'Authorization': `Session ${sessionId}`,
          'Cookie': `session_token=${sessionId}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!sessionResponse.ok) {
        logger.warn(`[Business API] Session validation failed: ${sessionResponse.status}, request ${requestId}`);
        return NextResponse.json(
          { error: 'Session invalid', requestId },
          { status: 401 }
        );
      }
      
      const sessionData = await sessionResponse.json();
      const tenantId = sessionData.tenant_id;
      
      if (!tenantId) {
        logger.warn(`[Business API] No tenant ID in session, request ${requestId}`);
        return NextResponse.json(
          { error: 'No tenant information available', requestId },
          { status: 404 }
        );
      }
      
      logger.debug(`[Business API] Fetching business data for tenant ${tenantId}, request ${requestId}`);
      
      // Now get the business/tenant information
      const businessResponse = await fetch(`${API_URL}/api/tenant/${tenantId}/`, {
        headers: {
          'Authorization': `Session ${sessionId}`,
          'Cookie': `session_token=${sessionId}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (businessResponse.ok) {
        const businessData = await businessResponse.json();
        logger.info(`[Business API] Business data retrieved successfully, request ${requestId}`);
        
        // Transform backend business data to frontend format
        const businessInfo = {
          businessName: businessData.business_name || businessData.name || '',
          businessType: businessData.business_type || businessData.type || '',
          email: businessData.email || sessionData.email || '',
          phone: businessData.phone || businessData.phone_number || '',
          website: businessData.website || '',
          industry: businessData.industry || '',
          description: businessData.description || '',
          taxId: businessData.tax_id || businessData.ein || '',
          registrationNumber: businessData.registration_number || '',
          yearEstablished: businessData.year_established || '',
          address: {
            street: businessData.address?.street || '',
            city: businessData.address?.city || '',
            state: businessData.address?.state || '',
            zipCode: businessData.address?.zip_code || businessData.address?.zipCode || '',
            country: businessData.address?.country || 'US'
          },
          tenantId: tenantId,
          requestId,
          source: 'backend-real-data'
        };
        
        return NextResponse.json(businessInfo);
      } else {
        logger.warn(`[Business API] Business data request failed: ${businessResponse.status}, request ${requestId}`);
        
        // Return partial data from session if business endpoint fails
        const fallbackInfo = {
          businessName: sessionData.business_name || '',
          businessType: sessionData.business_type || '',
          email: sessionData.email || '',
          phone: sessionData.phone_number || '',
          website: '',
          industry: '',
          description: '',
          taxId: '',
          registrationNumber: '',
          yearEstablished: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'US'
          },
          tenantId: tenantId,
          requestId,
          source: 'session-fallback'
        };
        
        return NextResponse.json(fallbackInfo);
      }
      
    } catch (backendError) {
      logger.error(`[Business API] Backend connection failed: ${backendError.message}, request ${requestId}`);
      
      // Return empty business data structure as fallback
      const emptyBusinessInfo = {
        businessName: '',
        businessType: '',
        email: '',
        phone: '',
        website: '',
        industry: '',
        description: '',
        taxId: '',
        registrationNumber: '',
        yearEstablished: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        },
        tenantId: null,
        requestId,
        source: 'fallback-empty',
        error: 'Backend connection failed'
      };
      
      return NextResponse.json(emptyBusinessInfo);
    }
    
  } catch (error) {
    logger.error(`[Business API] Error fetching business information: ${error.message}, request ${requestId}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch business information', 
        message: error.message,
        requestId 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update business information
 */
export async function PUT(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[Business API] Updating business information, request ${requestId}`);
    
    // Check authentication
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    
    if (!sidCookie && !sessionTokenCookie) {
      return NextResponse.json(
        { error: 'Not authenticated', requestId },
        { status: 401 }
      );
    }
    
    const sessionId = sidCookie?.value || sessionTokenCookie?.value;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    
    // Get the update data
    const updateData = await request.json();
    
    // Get tenant ID from session first
    const sessionResponse = await fetch(`${API_URL}/api/sessions/current/`, {
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!sessionResponse.ok) {
      return NextResponse.json(
        { error: 'Session invalid', requestId },
        { status: 401 }
      );
    }
    
    const sessionData = await sessionResponse.json();
    const tenantId = sessionData.tenant_id;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant information available', requestId },
        { status: 404 }
      );
    }
    
    // Transform frontend data to backend format
    const backendUpdateData = {
      business_name: updateData.businessName,
      business_type: updateData.businessType,
      email: updateData.email,
      phone: updateData.phone,
      website: updateData.website,
      industry: updateData.industry,
      description: updateData.description,
      tax_id: updateData.taxId,
      registration_number: updateData.registrationNumber,
      year_established: updateData.yearEstablished,
      address: {
        street: updateData.address?.street,
        city: updateData.address?.city,
        state: updateData.address?.state,
        zip_code: updateData.address?.zipCode,
        country: updateData.address?.country || 'US'
      }
    };
    
    // Update business information via backend API
    const updateResponse = await fetch(`${API_URL}/api/tenant/${tenantId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Session ${sessionId}`,
        'Cookie': `session_token=${sessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendUpdateData)
    });
    
    if (updateResponse.ok) {
      const updatedData = await updateResponse.json();
      logger.info(`[Business API] Business information updated successfully, request ${requestId}`);
      
      return NextResponse.json({
        success: true,
        message: 'Business information updated successfully',
        data: updatedData,
        requestId
      });
    } else {
      logger.error(`[Business API] Update failed: ${updateResponse.status}, request ${requestId}`);
      return NextResponse.json(
        { 
          error: 'Failed to update business information', 
          status: updateResponse.status,
          requestId 
        },
        { status: updateResponse.status }
      );
    }
    
  } catch (error) {
    logger.error(`[Business API] Error updating business information: ${error.message}, request ${requestId}`);
    
    return NextResponse.json(
      { 
        error: 'Failed to update business information', 
        message: error.message,
        requestId 
      },
      { status: 500 }
    );
  }
}