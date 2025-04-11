import { NextResponse } from 'next/server';

export async function GET(request) {
  // Generate a unique request ID for tracing
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
  console.log(`[API] [${requestId}] Inventory GET request received`);
  
  try {
    // Extract tenant ID from request headers
    const tenantId = request.headers.get('x-tenant-id');
    console.log(`[API] [${requestId}] Tenant ID from header:`, tenantId);
    
    // Get search params
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 100;
    const offset = searchParams.get('offset') || 0;
    console.log(`[API] [${requestId}] Query params:`, { limit, offset });
    
    // Generate mock inventory data
    console.log(`[API] [${requestId}] Generating mock inventory data for tenant:`, tenantId);
    const mockData = generateMockInventory(limit, tenantId);
    
    console.log(`[API] [${requestId}] Successfully generated ${mockData.length} inventory items`);
    return NextResponse.json(mockData);
  } catch (error) {
    console.error(`[API] [${requestId}] Error in inventory GET:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch inventory', 
        message: error.message,
        requestId 
      }, 
      { status: 500 }
    );
  }
}

// Helper function to generate mock inventory data
function generateMockInventory(limit = 100, tenantId = 'default') {
  console.log(`Generating ${limit} mock inventory items for tenant ${tenantId}`);
  
  const items = [];
  const categories = ['Electronics', 'Clothing', 'Food', 'Office Supplies', 'Furniture'];
  
  for (let i = 0; i < limit; i++) {
    const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const stockLevel = Math.floor(Math.random() * 100);
    
    items.push({
      id,
      name: `Product ${i + 1}`,
      description: `Description for product ${i + 1}`,
      category,
      stock_level: stockLevel,
      status: stockLevel > 10 ? 'In Stock' : stockLevel > 0 ? 'Low Stock' : 'Out of Stock',
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  return items;
} 