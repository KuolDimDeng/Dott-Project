'use server';

import { NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/serverLogger';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET handler that forwards to the inventory/products API
 */
export async function GET(request) {
  const url = new URL(request.url);
  const forwardUrl = new URL('/api/inventory/products', url.origin);
  
  // Copy over all search parameters
  url.searchParams.forEach((value, key) => {
    forwardUrl.searchParams.append(key, value);
  });
  
  // Special handling for schema parameter
  const schema = url.searchParams.get('schema');
  if (schema === 'default_schema') {
    // Remove default_schema as backend will handle tenant context
    forwardUrl.searchParams.delete('schema');
  }
  
  console.log(`API /products GET - Forwarding to /api/inventory/products`);
  console.log(`Forwarding GET request to: ${forwardUrl.pathname}${forwardUrl.search}`);
  
  try {
    // Forward the request to inventory/products
    const headers = new Headers(request.headers);
    headers.set('x-forwarded-by', 'api/products');
    
    const forwardResponse = await fetch(forwardUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(20000) // 20 second timeout
    });
    
    // Check if response is ok
    if (forwardResponse.ok) {
      return forwardResponse;
    } else {
      console.error(`Error in forwarded request: ${forwardResponse.status} ${forwardResponse.statusText}`);
      
      // Get error details
      const errorText = await forwardResponse.text();
      console.error(`Error response: ${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}`);
      
      // Return fallback product data for development
      console.log('Returning fallback product data due to forwarding error');
      return NextResponse.json({
        success: true,
        products: [
          {
            id: 1,
            name: 'Fallback Product 1',
            description: 'This is a fallback product when the inventory API fails',
            price: 19.99,
            stockQuantity: 100,
            reorderLevel: 10,
            forSale: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            name: 'Fallback Product 2',
            description: 'Another fallback product',
            price: 29.99,
            stockQuantity: 50,
            reorderLevel: 5,
            forSale: true,
            createdAt: new Date().toISOString(),
          }
        ]
      });
    }
  } catch (error) {
    console.error(`Error in forwarded request: ${error.message}`);
    
    // Return fallback product data for development
    console.log('Returning fallback product data due to forwarding error');
    return NextResponse.json({
      success: true,
      products: [
        {
          id: 1,
          name: 'Fallback Product 1',
          description: 'This is a fallback product when the inventory API fails',
          price: 19.99,
          stockQuantity: 100,
          reorderLevel: 10,
          forSale: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Fallback Product 2',
          description: 'Another fallback product',
          price: 29.99,
          stockQuantity: 50,
          reorderLevel: 5,
          forSale: true,
          createdAt: new Date().toISOString(),
        }
      ]
    });
  }
}

/**
 * POST handler that forwards to the inventory/products API
 */
export async function POST(request) {
  const url = new URL(request.url);
  const forwardUrl = new URL('/api/inventory/products', url.origin);
  
  // Copy over all search parameters
  url.searchParams.forEach((value, key) => {
    forwardUrl.searchParams.append(key, value);
  });
  
  // Special handling for schema parameter
  const schema = url.searchParams.get('schema');
  if (schema === 'default_schema') {
    // Remove default_schema as backend will handle tenant context
    forwardUrl.searchParams.delete('schema');
  }
  
  console.log(`API /products POST - Forwarding to /api/inventory/products`);
  console.log(`Forwarding POST request to: ${forwardUrl.pathname}${forwardUrl.search}`);
  
  try {
    // Clone the request body
    const requestBody = await request.json();
    
    // Forward the request to inventory/products
    const headers = new Headers(request.headers);
    headers.set('x-forwarded-by', 'api/products');
    headers.set('Content-Type', 'application/json');
    
    const forwardResponse = await fetch(forwardUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(20000) // 20 second timeout
    });
    
    // Check if response is ok
    if (forwardResponse.ok) {
      return forwardResponse;
    } else {
      console.error(`Error in forwarded request: ${forwardResponse.status} ${forwardResponse.statusText}`);
      
      // Get error details
      const errorText = await forwardResponse.text();
      console.error(`Error response: ${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}`);
      
      // Return error response
      return NextResponse.json({
        success: false,
        message: 'Error creating product',
        error: `Forwarding error: ${forwardResponse.status} ${forwardResponse.statusText}`
      }, { status: forwardResponse.status });
    }
  } catch (error) {
    console.error(`Error in forwarded request: ${error.message}`);
    
    // Return error response
    return NextResponse.json({
      success: false,
      message: 'Error creating product',
      error: `Error: ${error.message}`
    }, { status: 500 });
  }
}

/**
 * PUT handler that forwards to the inventory/products API
 */
export async function PUT(request) {
  try {
    logger.info('API /products PUT - Forwarding to /api/inventory/products');
    const data = await request.json();
    const id = data.id;
    
    if (!id) {
      return NextResponse.json({ 
        error: 'Product ID is required for update', 
      }, { status: 400 });
    }
    
    // Extract needed headers to forward
    const headers = {};
    if (request.headers.has('x-tenant-id')) {
      headers['x-tenant-id'] = request.headers.get('x-tenant-id');
    }
    if (request.headers.has('x-id-token')) {
      headers['x-id-token'] = request.headers.get('x-id-token');
    }
    if (request.headers.has('authorization')) {
      headers['authorization'] = request.headers.get('authorization');
    }
    
    // Map fields if necessary to match the inventory/products API
    const mappedData = {
      ...data,
      // Make sure these fields exist as the inventory endpoint expects them
      product_name: data.product_name || data.name,
      stock_quantity: data.stock_quantity || data.stock || 0,
      is_for_sale: data.is_for_sale !== undefined ? data.is_for_sale : true
    };
    
    // Forward the request
    const response = await axiosInstance.put(`/api/inventory/products/${id}`, mappedData, { headers });
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error('Error in /api/products PUT forwarding:', error);
    return NextResponse.json({ 
      error: 'Failed to update product', 
      message: error.message 
    }, { status: 500 });
  }
} 