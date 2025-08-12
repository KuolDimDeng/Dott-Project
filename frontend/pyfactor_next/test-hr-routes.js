// Test HR route resolution
const { routeRegistry } = require('./src/app/dashboard/router/routeRegistry.js');

const hrRoutes = [
  'hr-dashboard',
  'hr-employees', 
  'hr-timesheets',
  'hr-pay',
  'hr-benefits',
  'hr-performance',
  'hr-reports'
];

console.log('Testing HR Routes:\n');

hrRoutes.forEach(route => {
  const routeInfo = routeRegistry[route];
  if (routeInfo) {
    console.log(`✅ ${route}: Found - ${routeInfo.title}`);
  } else {
    console.log(`❌ ${route}: NOT FOUND`);
  }
});

console.log('\nAlternative routes:');
['employees', 'timesheets', 'pay', 'benefits', 'performance'].forEach(route => {
  const routeInfo = routeRegistry[route];
  if (routeInfo) {
    console.log(`✅ ${route}: Found - ${routeInfo.title}`);
  }
});