// Emergency JWT Test API Route
// Test Auth0 configuration with forced audience parameter
import { NextResponse } from 'next/server';
import { auth0Utils } from '@/config/auth0';

export async function GET(request) {
  try {
    console.log('🚨 EMERGENCY JWT TEST ROUTE - Testing Auth0 configuration');
    
    // Test if we can get a user and token
    const user = await auth0Utils.getUser();
    const token = await auth0Utils.getAccessToken();
    
    const result = {
      timestamp: new Date().toISOString(),
      user: user ? { email: user.email, sub: user.sub } : null,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      configTest: 'Using main auth0 config'
    };
    
    console.log('🔍 Emergency test result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Emergency JWT test failed:', error);
    return NextResponse.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 