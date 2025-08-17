// Build-time verification that Stripe key is available
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripeKey) {
  console.error('❌ CRITICAL: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set at build time!');
  console.error('This will cause payment failures in production.');
  console.error('Please ensure the environment variable is configured in Render.');
  process.exit(1);
} else {
  console.log(`✅ Stripe key found at build time: ${stripeKey.substring(0, 20)}...`);
  console.log(`   Type: ${stripeKey.startsWith('pk_test') ? 'TEST' : stripeKey.startsWith('pk_live') ? 'LIVE' : 'UNKNOWN'}`);
}
