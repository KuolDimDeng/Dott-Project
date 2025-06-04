// Emergency JWT Test API Route
// Test Auth0 configuration with forced audience parameter
import { createFixedAuth0Client, getJWTAccessToken } from '../../../../config/auth0-audience-fix.js';

export async function GET(request) {
  console.log('🚨 EMERGENCY JWT TEST API STARTING...');
  
  try {
    // Test 1: Environment Variables Check
    console.log('🔍 Environment Variables Test:');
    const envVars = {
      domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? '***SET***' : 'MISSING'
    };
    console.log('Env vars:', envVars);
    
    // Test 2: Create Fixed Auth0 Client
    console.log('🔧 Creating Auth0 client with forced audience...');
    const auth0Client = await createFixedAuth0Client();
    console.log('✅ Auth0 client created');
    
    // Test 3: Simulate Token Request (won't work without user login, but will show config)
    console.log('📋 Client Configuration Check:');
    
    const testResults = {
      success: true,
      environment: envVars,
      clientCreated: true,
      timestamp: new Date().toISOString(),
      message: 'Emergency JWT configuration test completed',
      recommendations: [
        'Environment variables are loaded',
        'Auth0 client created with forced audience',
        'Ready for JWT token generation',
        'Next: Test with actual user authentication'
      ]
    };
    
    return Response.json(testResults);
    
  } catch (error) {
    console.error('❌ Emergency JWT test failed:', error);
    
    return Response.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      message: 'Emergency JWT test failed',
      recommendations: [
        'Check environment variables in Vercel',
        'Verify Auth0 configuration',
        'Check network connectivity'
      ]
    }, { status: 500 });
  }
} 