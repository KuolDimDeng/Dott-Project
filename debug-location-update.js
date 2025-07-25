// Debug script to test location update API
// Run this in the browser console when on dottapps.com

async function debugLocationUpdate() {
  console.log('🔍 Debug Location Update API');
  console.log('==========================');
  
  try {
    // Test location ID 1
    const locationId = 1;
    const testData = {
      name: "Test Location Update " + new Date().toISOString(),
      description: "Testing update at " + new Date().toLocaleString(),
      is_active: true
    };
    
    console.log('\n📤 Sending PUT request to /api/inventory/locations/' + locationId);
    console.log('Request data:', testData);
    
    const response = await fetch(`/api/inventory/locations/${locationId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📊 Response details:');
    console.log('Status:', response.status, response.statusText);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
    
    // Clone response so we can read it twice
    const responseClone = response.clone();
    
    // Get raw text
    const responseText = await response.text();
    console.log('\n📋 Raw response text:');
    console.log('Length:', responseText.length);
    console.log('First 500 chars:', responseText.substring(0, 500));
    
    // Check if empty
    if (responseText.length === 0) {
      console.log('\n⚠️  Response body is EMPTY!');
      return;
    }
    
    // Try to parse as JSON
    try {
      const jsonData = await responseClone.json();
      console.log('\n✅ Parsed JSON successfully:');
      console.log(jsonData);
    } catch (parseError) {
      console.log('\n❌ JSON parse error:', parseError.message);
      
      // Check if HTML
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.log('⚠️  Response is HTML, not JSON!');
        
        // Try to extract title
        const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
          console.log('HTML title:', titleMatch[1]);
        }
        
        // Try to extract any error messages
        const bodyMatch = responseText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          const bodyText = bodyMatch[1].replace(/<[^>]*>/g, '').trim();
          console.log('Body text (first 200 chars):', bodyText.substring(0, 200));
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

// Run the debug function
debugLocationUpdate();