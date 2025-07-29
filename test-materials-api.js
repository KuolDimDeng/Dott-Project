// Test script to trigger material creation
// Run this in browser console on app.dottapps.com

async function testMaterialCreation() {
  console.log('🧪 Testing material creation...');
  
  try {
    const testData = {
      name: 'Test Hammer',
      sku: '',
      description: 'Test material for debugging',
      quantity_in_stock: 10,
      reorder_level: 5,
      unit_cost: 25.50,
      material_type: 'tool',
      unit: 'unit',
      markup_percentage: 20,
      is_billable: true
    };

    console.log('🧪 Sending test data:', testData);
    
    const response = await fetch('/api/inventory/materials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('🧪 Response status:', response.status);
    console.log('🧪 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    console.log('🧪 Response data:', responseData);
    
    if (response.ok) {
      console.log('✅ SUCCESS: Material created successfully!');
      return responseData;
    } else {
      console.log('❌ FAILED: Material creation failed');
      return null;
    }
    
  } catch (error) {
    console.error('🚨 ERROR:', error);
    return null;
  }
}

// Run the test
testMaterialCreation();