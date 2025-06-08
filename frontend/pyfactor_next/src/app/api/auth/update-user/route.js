import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Auth0 User Update API Endpoint
 * 
 * This endpoint handles updating user metadata in the Auth0 session.
 * It replaces the AWS Cognito updateUserAttributes functionality.
 */

export async function POST(request) {
  try {
    console.log('[Auth0 Update User] POST request received');
    
    // Get the current Auth0 session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'No Auth0 session found'
      }, { status: 401 });
    }
    
    // Parse the session data
    let sessionData;
    try {
      sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    } catch (parseError) {
      console.error('[Auth0 Update User] Error parsing session cookie:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid session data'
      }, { status: 401 });
    }
    
    // Get the attributes to update from the request body
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data'
      }, { status: 400 });
    }
    
    const { attributes } = requestData;
    if (!attributes || typeof attributes !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'No attributes provided'
      }, { status: 400 });
    }
    
    console.log('[Auth0 Update User] Updating user attributes:', Object.keys(attributes));
    
    // Update the user object in the session with the new attributes
    const updatedUser = {
      ...sessionData.user,
      ...attributes,
      lastUpdated: new Date().toISOString()
    };
    
    // Create the updated session data
    const updatedSessionData = {
      ...sessionData,
      user: updatedUser
    };
    
    // Encode the updated session
    const updatedSessionCookie = Buffer.from(JSON.stringify(updatedSessionData)).toString('base64');
    
    // Create the response
    const response = NextResponse.json({
      success: true,
      message: 'User attributes updated successfully',
      updatedAttributes: Object.keys(attributes)
    });
    
    // Set the updated session cookie
    response.cookies.set('appSession', updatedSessionCookie, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      domain: process.env.NODE_ENV === 'production' ? '.dottapps.com' : undefined
    });
    
    console.log('[Auth0 Update User] Successfully updated user attributes');
    return response;
    
  } catch (error) {
    console.error('[Auth0 Update User] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}