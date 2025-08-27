import { NextResponse } from 'next/server';
import { djangoApiClient } from '@/utils/djangoApiClient';

export async function POST(request) {
  try {
    const { token, email } = await request.json();
    
    if (!token || !email) {
      return NextResponse.json(
        { error: 'Missing invitation token or email' },
        { status: 400 }
      );
    }
    
    // Verify invitation with backend
    const response = await djangoApiClient.post('/auth/rbac/invitations/verify/', {
      token,
      email
    });
    
    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: 400 }
      );
    }
    
    // Return invitation details
    return NextResponse.json({
      businessName: response.data.tenant_name,
      role: response.data.role,
      invitedBy: response.data.invited_by_name,
      permissions: response.data.page_permissions
    });
    
  } catch (error) {
    console.error('[verify-invitation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}