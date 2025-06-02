import { NextResponse } from 'next/server';
import { getAccessToken } from '@auth0/nextjs-auth0';

export async function GET(request) {
  try {
    // Get the access token from Auth0
    const { accessToken } = await getAccessToken(request, NextResponse.next());
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available' },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      accessToken,
      success: true 
    });
  } catch (error) {
    console.error('[API] Error getting access token:', error);
    return NextResponse.json(
      { error: 'Failed to get access token' },
      { status: 500 }
    );
  }
} 