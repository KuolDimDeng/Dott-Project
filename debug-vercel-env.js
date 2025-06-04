// Debug Vercel Environment Variables and Auth0 Configuration
console.log('🔍 VERCEL ENVIRONMENT VARIABLES DEBUG');
console.log('=====================================');

console.log('Auth0 Domain:', process.env.NEXT_PUBLIC_AUTH0_DOMAIN);
console.log('Auth0 Audience:', process.env.NEXT_PUBLIC_AUTH0_AUDIENCE);
console.log('Auth0 Client ID:', process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ? '***SET***' : 'MISSING');

console.log('\n🎯 EXPECTED VALUES:');
console.log('Domain should be: dev-cbyy63jovi6zrcos.us.auth0.com');
console.log('Audience should be: https://dev-cbyy63jovi6zrcos.us.auth0.com/api/v2/');

console.log('\n📋 AUTH0 CLIENT CONFIG TEST:');
const config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-cbyy63jovi6zrcos.us.auth0.com',
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
  authorizationParams: {
    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    response_type: 'code',
    scope: 'openid profile email'
  },
  useCustomDomain: false // CRITICAL: This should be false to generate JWT
};

console.log('Final Config:', {
  domain: config.domain,
  audience: config.authorizationParams.audience,
  useCustomDomain: config.useCustomDomain,
  willGenerateJWT: !config.useCustomDomain
}); 