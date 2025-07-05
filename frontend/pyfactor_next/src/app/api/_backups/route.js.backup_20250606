// Debug Environment Variables API Route
export async function GET() {
  console.log('🔍 Environment Variables Debug Check');
  
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_AUTH0_DOMAIN: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    NEXT_PUBLIC_AUTH0_AUDIENCE: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? '***SET***' : 'MISSING',
    
    // Expected values
    EXPECTED_DOMAIN: 'dev-cbyy63jovi6zrcos.us.auth0.com',
    EXPECTED_AUDIENCE: 'https://api.dottapps.com',
    EXPECTED_CLIENT_ID: 'GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ',
    
    // Configuration test
    SHOULD_USE_CUSTOM_DOMAIN: false,
    SHOULD_GENERATE_JWT: true
  };
  
  console.log('🔍 Current Environment Variables:', envVars);
  
  // Check if values match expected
  const isCorrect = {
    domain: envVars.NEXT_PUBLIC_AUTH0_DOMAIN === envVars.EXPECTED_DOMAIN,
    audience: envVars.NEXT_PUBLIC_AUTH0_AUDIENCE === envVars.EXPECTED_AUDIENCE,
    clientId: !!envVars.NEXT_PUBLIC_AUTH0_CLIENT_ID
  };
  
  const allCorrect = Object.values(isCorrect).every(Boolean);
  
  return Response.json({
    status: allCorrect ? 'SUCCESS' : 'NEEDS_FIX',
    environment: envVars,
    validation: isCorrect,
    message: allCorrect 
      ? 'Environment variables are correct for JWT generation'
      : 'Environment variables need adjustment',
    recommendations: allCorrect ? [] : [
      !isCorrect.domain && 'Set NEXT_PUBLIC_AUTH0_DOMAIN to dev-cbyy63jovi6zrcos.us.auth0.com',
      !isCorrect.audience && 'Set NEXT_PUBLIC_AUTH0_AUDIENCE to https://api.dottapps.com',
      !isCorrect.clientId && 'Set NEXT_PUBLIC_AUTH0_CLIENT_ID to GZ5tqWE0VWusmykGZXfoxRkKJ6MMvIvJ'
    ].filter(Boolean)
  });
} 