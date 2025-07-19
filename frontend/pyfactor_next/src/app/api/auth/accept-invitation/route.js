import { NextResponse } from 'next/server';
import { djangoApiClient } from '@/utils/djangoApiClient';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { token, email } = await request.json();
    
    if (!token || !email) {
      return NextResponse.json(
        { error: 'Missing invitation token or email' },
        { status: 400 }
      );
    }
    
    // Get the current session
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'User must be authenticated to accept invitation' },
        { status: 401 }
      );
    }
    
    // Accept invitation with backend
    const response = await djangoApiClient.post('/api/auth/rbac/invitations/accept/', {
      token,
      email
    });
    
    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: 400 }
      );
    }
    
    // Clear invitation data from session storage
    return NextResponse.json({
      success: true,
      tenantId: response.data.tenant_id,
      role: response.data.role,
      permissions: response.data.permissions
    });
    
  } catch (error) {
    console.error('[accept-invitation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}