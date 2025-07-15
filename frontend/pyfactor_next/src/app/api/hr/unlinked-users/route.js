/**
 * Unlinked Users API
 * Fetches users without employee records for the HR employee creation form
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    logger.info('[UnlinkedUsers API] ========== START ==========');
    
    // Get session ID from cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    
    logger.info('[UnlinkedUsers API] Session ID:', sessionId ? sessionId.substring(0, 8) + '...' : 'none');
    
    if (!sessionId) {
      logger.warn('[UnlinkedUsers API] No session ID found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Call backend API to get unlinked users
    const backendUrl = process.env.BACKEND_URL || 'https://dott-api-v1.onrender.com';
    const apiUrl = `${backendUrl}/auth/rbac/users?unlinked=true`;
    
    logger.info('[UnlinkedUsers API] Calling backend:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sid=${sessionId}`,
        'X-Session-ID': sessionId
      },
      cache: 'no-store'
    });
    
    logger.info('[UnlinkedUsers API] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('[UnlinkedUsers API] Backend error:', errorText);
      
      // Return empty list instead of error to avoid breaking the UI
      return NextResponse.json({
        users: [],
        total: 0,
        message: 'Unable to fetch unlinked users'
      });
    }
    
    const data = await response.json();
    logger.info('[UnlinkedUsers API] Data received:', {
      isArray: Array.isArray(data),
      hasUsers: 'users' in data,
      count: data?.users?.length || data?.length || 0
    });
    
    // Ensure consistent response format
    const users = Array.isArray(data) ? data : (data.users || []);
    
    logger.info('[UnlinkedUsers API] Returning users:', users.length);
    
    return NextResponse.json({
      users: users,
      total: users.length
    });
    
  } catch (error) {
    logger.error('[UnlinkedUsers API] Error:', error);
    
    // Return empty list on error to avoid breaking the UI
    return NextResponse.json({
      users: [],
      total: 0,
      message: 'Error fetching users'
    });
  }
}