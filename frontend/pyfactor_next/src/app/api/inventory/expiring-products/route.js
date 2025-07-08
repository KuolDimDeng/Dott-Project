// Inventory Expiring Products API Endpoint
// Fetches products nearing expiration from the database

import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// GET - Fetch expiring products from database
export async function GET(request) {
  try {
    // Check session cookie
    const cookies = request.headers.get('cookie') || '';
    const hasSession = cookies.includes('sid=') || cookies.includes('session_token=');
    
    if (!hasSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const daysAhead = searchParams.get('days') || 30; // Default to 30 days
    const location = searchParams.get('location'); // Optional: filter by location

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Calculate date range
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(daysAhead));

    // Build query parameters
    const queryParams = new URLSearchParams({
      tenant_id: tenantId,
      has_expiry: 'true',
      expiry_before: futureDate.toISOString().split('T')[0],
      expiry_after: today.toISOString().split('T')[0]
    });

    if (location) queryParams.append('location_id', location);

    // Fetch products with expiry dates from backend
    const response = await fetch(
      `${API_BASE_URL}/api/inventory/products?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies,
          'X-Tenant-Id': tenantId
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Expiring Products API] Backend error:', errorData);
      
      // If no products found, return empty array instead of error
      if (response.status === 404) {
        return NextResponse.json([]);
      }
      
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch inventory data' },
        { status: response.status }
      );
    }

    const products = await response.json();

    // Transform product data to calendar events
    const expiryEvents = products
      .filter(product => product.expiry_date) // Only products with expiry dates
      .map(product => {
        const expiryDate = new Date(product.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        // Determine urgency and color
        let urgency = 'low';
        let backgroundColor = '#F59E0B'; // Amber default
        let icon = '⚠️';
        
        if (daysUntilExpiry <= 7) {
          urgency = 'critical';
          backgroundColor = '#DC2626'; // Red
          icon = '🚨';
        } else if (daysUntilExpiry <= 14) {
          urgency = 'high';
          backgroundColor = '#EF4444'; // Light red
          icon = '⚠️';
        } else if (daysUntilExpiry <= 21) {
          urgency = 'medium';
          backgroundColor = '#F59E0B'; // Amber
          icon = '📦';
        }
        
        return {
          id: `expiry-${product.id}-${product.batch_number || 'nobatch'}`,
          title: `${icon} ${product.name} Expires${product.batch_number ? ` (Batch: ${product.batch_number})` : ''}`,
          start: product.expiry_date,
          allDay: true,
          type: 'productExpiry',
          backgroundColor: backgroundColor,
          borderColor: backgroundColor,
          editable: false,
          extendedProps: {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            batchNumber: product.batch_number,
            quantity: product.quantity_on_hand,
            location: product.location_name,
            locationId: product.location_id,
            daysUntilExpiry: daysUntilExpiry,
            urgency: urgency,
            value: product.quantity_on_hand * (product.unit_cost || 0),
            supplier: product.supplier_name
          }
        };
      });

    // Add reminder events for critical expiries
    const reminderEvents = products
      .filter(product => {
        if (!product.expiry_date) return false;
        const daysUntilExpiry = Math.ceil((new Date(product.expiry_date) - today) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry > 7 && daysUntilExpiry <= 30; // Only for products expiring in 8-30 days
      })
      .map(product => {
        const expiryDate = new Date(product.expiry_date);
        const reminderDate = new Date(expiryDate);
        reminderDate.setDate(reminderDate.getDate() - 7); // 7 days before expiry
        
        return {
          id: `expiry-reminder-${product.id}-${product.batch_number || 'nobatch'}`,
          title: `📅 Reminder: ${product.name} expires in 7 days`,
          start: reminderDate.toISOString().split('T')[0],
          allDay: true,
          type: 'reminder',
          backgroundColor: '#14B8A6', // Teal
          borderColor: '#14B8A6',
          editable: false,
          extendedProps: {
            isReminder: true,
            productId: product.id,
            productName: product.name,
            expiryDate: product.expiry_date,
            quantity: product.quantity_on_hand,
            description: `${product.name} will expire on ${new Date(product.expiry_date).toLocaleDateString()}`
          }
        };
      });

    // Combine expiry events and reminders
    const allEvents = [...expiryEvents, ...reminderEvents];

    // Sort by date
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    return NextResponse.json(allEvents);
  } catch (error) {
    console.error('[Expiring Products API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}