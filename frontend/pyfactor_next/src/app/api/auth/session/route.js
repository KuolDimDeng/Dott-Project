import { getSession } from '@auth0/nextjs-auth0';

/**
 * Custom session endpoint to ensure properly formatted JSON responses
 * This endpoint is called by the Next Auth client library
 * Falls back to Cognito when NextAuth fails
 */
export async function GET(request) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }
    
    return Response.json({
      user: session.user,
      isAuthenticated: true
    });
  } catch (error) {
    console.error('[Auth Session] Error:', error);
    return Response.json({ error: 'Session error' }, { status: 500 });
  }
} 