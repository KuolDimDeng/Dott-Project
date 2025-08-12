// Test script to check cookie handling
const API_URL = 'https://api.dottapps.com';

async function testConsolidatedAuth() {
  console.log('Testing consolidated auth endpoint...\n');
  
  try {
    // Test the consolidated auth endpoint
    const response = await fetch(`${API_URL}/api/sessions/consolidated-auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://dottapps.com',
      },
      body: JSON.stringify({
        auth0_sub: 'auth0|686ad1e726d71a17b366bb03',
        email: 'kuoldimdeng@outlook.com',
        access_token: 'dummy-token', // This won't work but will show the response
        name: 'Kuol Deng',
        given_name: 'Kuol',
        family_name: 'Deng'
      })
    });
    
    console.log('Status:', response.status);
    console.log('\nHeaders:');
    console.log(Object.fromEntries(response.headers));
    
    // Check for set-cookie headers
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      console.log('\nSet-Cookie headers (multiple):');
      setCookieHeaders.forEach((cookie, i) => {
        console.log(`  ${i + 1}: ${cookie}`);
      });
    } else {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        console.log('\nSet-Cookie header:', setCookie);
      } else {
        console.log('\nNo set-cookie headers found');
      }
    }
    
    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testConsolidatedAuth();