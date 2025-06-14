#!/usr/bin/env node

console.log('=== Environment Variable Check ===');
console.log('Build Time:', new Date().toISOString());
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

console.log('Stripe Environment Variables:');
console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', 
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 
    ? `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 20)}... (length: ${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.length})`
    : 'NOT SET'
);

console.log('');
console.log('All NEXT_PUBLIC_ variables:');
Object.keys(process.env)
  .filter(key => key.startsWith('NEXT_PUBLIC_'))
  .forEach(key => {
    const value = process.env[key];
    console.log(`  ${key}:`, value ? `Set (length: ${value.length})` : 'NOT SET');
  });

console.log('');
console.log('=== End Environment Check ===');