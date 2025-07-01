// Inventory Expiring Products API Endpoint
// Fetches product expiry dates for calendar integration

import { NextResponse } from 'next/server';

// Mock expiring products data (replace with actual database queries)
const mockExpiringProducts = [
  {
    id: 'product-1',
    name: 'Organic Milk',
    sku: 'ORG-MILK-001',
    expiryDate: '2025-07-20',
    quantity: 24,
    location: 'Refrigerator A-1',
    category: 'Dairy',
    costPerUnit: 3.50,
    alertDays: 7
  },
  {
    id: 'product-2',
    name: 'Fresh Bread',
    sku: 'BREAD-WHT-002',
    expiryDate: '2025-07-25',
    quantity: 15,
    location: 'Shelf B-3',
    category: 'Bakery',
    costPerUnit: 2.99,
    alertDays: 3
  },
  {
    id: 'product-3',
    name: 'Pharmaceutical Supplement',
    sku: 'PHARMA-001',
    expiryDate: '2025-08-15',
    quantity: 50,
    location: 'Pharmacy Storage',
    category: 'Pharmaceuticals',
    costPerUnit: 25.00,
    alertDays: 30
  },
  {
    id: 'product-4',
    name: 'Frozen Vegetables',
    sku: 'FRZ-VEG-003',
    expiryDate: '2025-09-30',
    quantity: 100,
    location: 'Freezer C-2',
    category: 'Frozen Foods',
    costPerUnit: 4.25,
    alertDays: 14
  }
];

// GET - Fetch expiring products
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const daysAhead = parseInt(searchParams.get('daysAhead')) || 90; // Default to 90 days ahead
    const category = searchParams.get('category'); // Optional: filter by category
    const location = searchParams.get('location'); // Optional: filter by location
    const urgentOnly = searchParams.get('urgentOnly'); // Optional: only show urgent items

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID
    // 2. Query the database for products belonging to this tenant
    // 3. Filter products by expiry date within the specified range
    // 4. Apply filters for category, location, urgency, etc.
    
    console.log(`[Expiring Products API] Fetching expiring products for tenant: ${tenantId}, days ahead: ${daysAhead}`);

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    let filteredProducts = mockExpiringProducts;

    // Filter by expiry date range
    filteredProducts = filteredProducts.filter(product => {
      const expiryDate = new Date(product.expiryDate);
      return expiryDate >= today && expiryDate <= futureDate;
    });

    // Filter by category if specified
    if (category) {
      filteredProducts = filteredProducts.filter(product => 
        product.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Filter by location if specified
    if (location) {
      filteredProducts = filteredProducts.filter(product => 
        product.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter for urgent items only if requested (expiring within alert days)
    if (urgentOnly === 'true') {
      filteredProducts = filteredProducts.filter(product => {
        const expiryDate = new Date(product.expiryDate);
        const alertDate = new Date();
        alertDate.setDate(today.getDate() + (product.alertDays || 7));
        return expiryDate <= alertDate;
      });
    }

    // Calculate additional info for each product
    const enrichedProducts = filteredProducts.map(product => {
      const expiryDate = new Date(product.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      const totalValue = product.quantity * product.costPerUnit;
      const isUrgent = daysUntilExpiry <= (product.alertDays || 7);

      return {
        ...product,
        daysUntilExpiry,
        totalValue: parseFloat(totalValue.toFixed(2)),
        isUrgent,
        urgencyLevel: isUrgent ? (daysUntilExpiry <= 1 ? 'critical' : 'high') : 'normal'
      };
    });

    // Sort by expiry date (soonest first)
    enrichedProducts.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    // Calculate summary statistics
    const totalProducts = enrichedProducts.length;
    const urgentProducts = enrichedProducts.filter(p => p.isUrgent).length;
    const totalValue = enrichedProducts.reduce((sum, p) => sum + p.totalValue, 0);
    const criticalProducts = enrichedProducts.filter(p => p.urgencyLevel === 'critical').length;

    return NextResponse.json({
      success: true,
      products: enrichedProducts,
      summary: {
        totalProducts,
        urgentProducts,
        criticalProducts,
        totalValue: parseFloat(totalValue.toFixed(2))
      },
      filters: {
        daysAhead,
        category,
        location,
        urgentOnly: urgentOnly === 'true'
      }
    });

  } catch (error) {
    console.error('[Expiring Products API] Error fetching expiring products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiring products' },
      { status: 500 }
    );
  }
}

// POST - Add expiry information for a product
export async function POST(request) {
  try {
    const body = await request.json();
    const { tenantId, productId, name, sku, expiryDate, quantity, location, category, costPerUnit, alertDays } = body;

    if (!tenantId || !productId || !name || !expiryDate) {
      return NextResponse.json(
        { error: 'Tenant ID, product ID, name, and expiry date are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID and user permissions
    // 2. Check if the product exists and belongs to the tenant
    // 3. Add/update the expiry information in the database
    
    const productExpiry = {
      id: productId,
      name,
      sku: sku || 'N/A',
      expiryDate,
      quantity: quantity || 0,
      location: location || 'Not specified',
      category: category || 'General',
      costPerUnit: costPerUnit || 0,
      alertDays: alertDays || 7,
      createdAt: new Date().toISOString()
    };

    console.log(`[Expiring Products API] Adding expiry info for product ${productId} in tenant: ${tenantId}`, productExpiry);

    return NextResponse.json({
      success: true,
      product: productExpiry,
      message: 'Product expiry information added successfully'
    });

  } catch (error) {
    console.error('[Expiring Products API] Error adding product expiry info:', error);
    return NextResponse.json(
      { error: 'Failed to add product expiry information' },
      { status: 500 }
    );
  }
}

// PUT - Update expiry information for a product
export async function PUT(request) {
  try {
    const body = await request.json();
    const { productId, tenantId, expiryDate, quantity, location, alertDays } = body;

    if (!productId || !tenantId) {
      return NextResponse.json(
        { error: 'Product ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would:
    // 1. Validate the tenant ID and user permissions
    // 2. Check if the product exists and belongs to the tenant
    // 3. Update the expiry information in the database
    
    const updatedProduct = {
      id: productId,
      expiryDate,
      quantity,
      location,
      alertDays,
      updatedAt: new Date().toISOString()
    };

    console.log(`[Expiring Products API] Updating expiry info for product ${productId} in tenant: ${tenantId}`, updatedProduct);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Product expiry information updated successfully'
    });

  } catch (error) {
    console.error('[Expiring Products API] Error updating product expiry info:', error);
    return NextResponse.json(
      { error: 'Failed to update product expiry information' },
      { status: 500 }
    );
  }
}