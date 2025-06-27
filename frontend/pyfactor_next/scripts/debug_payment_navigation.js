// Debug script to test payment navigation
// Run this in the browser console to test if payment navigation events work

console.log('=== Testing Payment Navigation ===');

// Test dispatching a payment navigation event manually
const testPaymentNavigation = () => {
  const navigationKey = `nav-${Date.now()}`;
  const payload = { 
    item: 'payments-dashboard', 
    navigationKey,
    originalItem: 'Dashboard'
  };
  
  console.log('Dispatching payment navigation event:', payload);
  
  // Dispatch navigation events
  window.dispatchEvent(new CustomEvent('menuNavigation', { detail: payload }));
  window.dispatchEvent(new CustomEvent('navigationChange', { detail: payload }));
};

// Test if the payment menu items exist in DOM
const checkPaymentMenuItems = () => {
  console.log('\n=== Checking Payment Menu Items in DOM ===');
  
  // Look for buttons with payment-related text
  const buttons = Array.from(document.querySelectorAll('button'));
  const paymentButtons = buttons.filter(btn => {
    const text = btn.textContent.toLowerCase();
    return text.includes('payment') || text.includes('receive') || text.includes('make');
  });
  
  console.log(`Found ${paymentButtons.length} payment-related buttons:`);
  paymentButtons.forEach((btn, index) => {
    console.log(`${index + 1}. "${btn.textContent.trim()}" - Has onClick: ${!!btn.onclick}`);
    
    // Check if button has event listeners
    const listeners = getEventListeners ? getEventListeners(btn) : null;
    if (listeners) {
      console.log(`   Event listeners:`, Object.keys(listeners));
    }
  });
};

// Check if handlePaymentsClick function exists
const checkHandlers = () => {
  console.log('\n=== Checking Handler Functions ===');
  console.log('window.handlePaymentsClick exists:', typeof window.handlePaymentsClick);
  
  // Try to find the function in React components
  const reactComponents = document.querySelectorAll('[class*="dashboard"]');
  console.log(`Found ${reactComponents.length} dashboard-related elements`);
};

// Run all checks
checkPaymentMenuItems();
checkHandlers();

console.log('\n=== Manual Test ===');
console.log('Run testPaymentNavigation() to manually trigger a payment navigation event');
window.testPaymentNavigation = testPaymentNavigation;