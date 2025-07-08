import { NextResponse } from 'next/server';

/**
 * Simple endpoint to check if AUTH0_CLIENT_SECRET is set in production
 * This helps diagnose the token exchange failure
 */
export async function GET() {
  const envCheck = {
    hasAuth0ClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
    auth0ClientSecretLength: process.env.AUTH0_CLIENT_SECRET ? process.env.AUTH0_CLIENT_SECRET.length : 0,
    hasAuth0Domain: !!process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    auth0Domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'NOT_SET',
    hasAuth0ClientId: !!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    hasBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'NOT_SET',
    nodeEnv: process.env.NODE_ENV
  };
  
  console.log('🔍 [EnvCheck] Environment check:', envCheck);
  
  if (!process.env.AUTH0_CLIENT_SECRET) {
    return NextResponse.json({
      error: 'AUTH0_CLIENT_SECRET is not set',
      message: 'Please add AUTH0_CLIENT_SECRET to your Render environment variables',
      envCheck
    }, { status: 500 });
  }
  
  return NextResponse.json({
    success: true,
    message: 'All required environment variables are set',
    envCheck
  });
}