#!/usr/bin/env node

/**
 * Test script to debug payment navigation flow
 * Run this in the browser console to test the navigation
 */

console.log('=== Testing Payment Navigation Flow ===');

// Function to test payment navigation
function testPaymentNavigation() {
  console.log('\n1. Dispatching payment navigation event...');
  
  const navigationKey = `nav-${Date.now()}`;
  const payload = { 
    item: 'payments-dashboard', 
    navigationKey,
    originalItem: 'Dashboard'
  };
  
  console.log('   Event payload:', payload);
  
  // Listen for state changes
  const originalSetState = window.React && window.React.useState;
  
  // Dispatch the events
  window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
  window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
  
  console.log('2. Events dispatched. Check console for component logs.');
  console.log('3. Expected logs:');
  console.log('   - [DashboardContent] Menu navigation event received: payments-dashboard');
  console.log('   - [RenderMainContent] Component rendered with view: payments-dashboard');
  console.log('   - [RenderMainContent] Rendering payments view: payments-dashboard');
  console.log('   - [PaymentGateways] Gateways loaded successfully (or similar)');
}

// Function to check current view state
function checkCurrentView() {
  console.log('\n=== Checking Current View State ===');
  
  // Try to find React components in the page
  const reactComponents = document.querySelectorAll('[data-reactroot], [class*="dashboard"]');
  console.log(`Found ${reactComponents.length} potential React components`);
  
  // Check if payment components are in the DOM
  const paymentElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = el.textContent || '';
    const className = el.className || '';
    return text.includes('Payment') || className.includes('payment');
  });
  
  console.log(`Found ${paymentElements.length} elements with "payment" in text or class`);
  
  // Check for loading spinners
  const spinners = document.querySelectorAll('[class*="animate-spin"]');
  console.log(`Found ${spinners.length} loading spinners`);
}

// Function to manually trigger handlePaymentsClick
function triggerHandlePaymentsClick() {
  console.log('\n=== Attempting to trigger handlePaymentsClick directly ===');
  
  // This would need to be called from within the React component context
  console.log('Note: handlePaymentsClick needs to be called from within React component context');
  console.log('The menu navigation events should trigger it automatically');
}

// Export functions for manual testing
window.testPaymentNavigation = testPaymentNavigation;
window.checkCurrentView = checkCurrentView;

console.log('\nFunctions available:');
console.log('- testPaymentNavigation() : Dispatch payment navigation events');
console.log('- checkCurrentView() : Check current view state and DOM');
console.log('\nRun testPaymentNavigation() to test payment navigation');