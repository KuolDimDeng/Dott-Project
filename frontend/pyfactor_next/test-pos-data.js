// Test script to verify POS data loading
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testProductsEndpoint() {
  console.log('\n=== Testing Products Endpoint ===');
  
  try {
    // Test the /api/products/ endpoint
    const response = await fetch(`${BASE_URL}/api/products/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your session cookie here if needed
        // 'Cookie': 'sid=your-session-id'
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.products) {
      console.log('\n✅ Products found:', data.products.length);
      data.products.forEach(product => {
        console.log(`- ${product.name} (SKU: ${product.sku || 'N/A'}, Price: $${product.price})`);
      });
    } else if (data.error) {
      console.log('\n❌ Error:', data.error);
    } else {
      console.log('\n⚠️  Unexpected response format');
    }
  } catch (error) {
    console.error('❌ Failed to test products endpoint:', error.message);
  }
}

async function testCustomersEndpoint() {
  console.log('\n=== Testing Customers Endpoint ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/customers/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your session cookie here if needed
        // 'Cookie': 'sid=your-session-id'
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.results || Array.isArray(data)) {
      const customers = data.results || data;
      console.log('\n✅ Customers found:', customers.length);
      customers.forEach(customer => {
        console.log(`- ${customer.name} (${customer.email})`);
      });
    } else if (data.error) {
      console.log('\n❌ Error:', data.error);
    } else {
      console.log('\n⚠️  Unexpected response format');
    }
  } catch (error) {
    console.error('❌ Failed to test customers endpoint:', error.message);
  }
}

async function testInventoryProductsEndpoint() {
  console.log('\n=== Testing Direct Inventory Products Endpoint ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/inventory/products/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your session cookie here if needed
        // 'Cookie': 'sid=your-session-id'
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Failed to test inventory products endpoint:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('Starting POS data tests...');
  await testProductsEndpoint();
  await testCustomersEndpoint();
  await testInventoryProductsEndpoint();
  console.log('\nTests completed.');
}

runTests();