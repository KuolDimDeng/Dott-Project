import { NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { getServerUser } from '@/utils/getServerUser';
import { cookies } from 'next/headers';

/**
 * API endpoint to get current user information
 * This is used by the sign-in page to check authentication status
 */
export async function GET(request) {
  try {
    // Get user from session - will be null if not authenticated
    const user = await getServerUser(request);
    
    // If no user, return null response
    if (!user) {
      console.debug('[api/me] No authenticated user found');
      return NextResponse.json({ 
        user: null,
        authenticated: false
      });
    }
    
    // Check cookies for onboarding status
    const cookieStore = await cookies();
    const onboardedStatus = cookieStore.get('onboardedStatus')?.value || 'NOT_STARTED';
    const setupCompleted = cookieStore.get('setupCompleted')?.value === 'true';
    
    // Return user information
    console.debug('[api/me] Returning authenticated user:', { 
      userId: user.id,
      email: user.attributes?.email || user.username,
      onboardedStatus, 
      setupCompleted 
    });
    
    return NextResponse.json({
      user: {
        id: user.id || user.userId,
        email: user.attributes?.email || user.username,
        onboardedStatus,
        setupCompleted
      },
      authenticated: true
    });
  } catch (error) {
    console.error('[api/me] Unexpected error getting user information:', error);
    return NextResponse.json({ 
      user: null, 
      authenticated: false,
      error: 'Unexpected error retrieving user information' 
    });
  }
} 