// Debug script to test location update API
// Run this in the browser console when on dottapps.com

async function testLocationUpdate() {
  console.log('🔍 Testing Location Update API...');
  
  const locationId = 1;
  const updateData = {
    name: 'Warehouse Main',
    description: 'Main warehouse location', 
    address: '123 Main Street, Suite 100, San Francisco, CA, 94105, US',
    street_address: '123 Main Street',
    street_address_2: 'Suite 100',
    city: 'San Francisco',
    state_province: 'CA',
    postal_code: '94105',
    country: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    is_active: true
  };
  
  try {
    console.log('📤 Sending PUT request to:', `/api/inventory/locations/${locationId}`);
    console.log('📋 Request data:', updateData);
    
    const response = await fetch(`/api/inventory/locations/${locationId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 Raw response text:', responseText);
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(responseText);
      console.log('✅ Parsed JSON:', data);
      return data;
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.log('📄 First 500 chars of response:', responseText.substring(0, 500));
      
      // Check if it's HTML
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.error('❌ Response is HTML, not JSON');
        
        // Try to extract error message from HTML
        const titleMatch = responseText.match(/<title>(.*?)<\/title>/);
        if (titleMatch) {
          console.error('Page title:', titleMatch[1]);
        }
      }
    }
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

// Run the test
testLocationUpdate();