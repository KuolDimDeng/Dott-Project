///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/onboarding/setup/status/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { validateServerSession } from '@/utils/serverUtils';

export async function GET(request) {
  try {
    // Validate session using server utils
    const { tokens, user } = await validateServerSession();
    
    if (!tokens?.accessToken || !tokens?.idToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get tenant ID from user attributes or cookies
    const tenantId = user.attributes['custom:businessid'];
    const setupDone = user.attributes['custom:setupdone'];
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID not found' },
        { status: 400 }
      );
    }

    // Check if setup is already done
    if (setupDone === 'TRUE') {
      return NextResponse.json({
        status: 'complete',
        progress: 100,
        message: 'Setup is complete',
        timestamp: new Date().toISOString()
      });
    }

    // Try to get setup status from backend - fix the endpoint to match backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      // Change endpoint to match the backend route structure
      const endpoint = `/api/onboarding/setup/status/`;
      const requestUrl = `${backendUrl}${endpoint}`;
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
          'X-Id-Token': tokens.idToken,
          'X-Tenant-ID': tenantId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          status: data.status || 'in_progress',
          progress: data.progress || 50,
          message: data.message || 'Setup in progress',
          timestamp: new Date().toISOString()
        });
      } else {
        // If backend fails, return a default response
        // This allows the dashboard to continue loading even if the backend is not available
        return NextResponse.json({
          status: 'in_progress',
          progress: 75, // Optimistic progress
          message: 'Setup in progress (backend status unavailable)',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('[SetupStatus] Error fetching status from backend:', error);
      
      // Return a default response to allow the dashboard to continue loading
      return NextResponse.json({
        status: 'in_progress',
        progress: 60,
        message: 'Setup in progress (status check failed)',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('[SetupStatus] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check setup status',
        message: error.message,
        status: 'unknown',
        progress: 0
      },
      { status: 500 }
    );
  }
}