'use server';

import { NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/serverLogger';

/**
 * GET handler that forwards to the inventory/products API
 */
export async function GET(request) {
  try {
    logger.info('API /products GET - Forwarding to /api/inventory/products');
    const { searchParams } = new URL(request.url);
    
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
    
    // Handle the schema parameter - convert default_schema to tenant-specific schema
    let url = '/api/inventory/products';
    if (searchParams.toString()) {
      // Handle default_schema - get tenant ID from cookies or localStorage
      if (searchParams.get('schema') === 'default_schema') {
        // Extract business ID from cookie
        const cookieHeader = request.headers.get('cookie');
        let businessId = null;
        
        if (cookieHeader) {
          cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name === 'businessid') {
              businessId = value;
            }
          });
        }
        
        if (businessId) {
          // Replace default_schema with tenant-specific schema
          const updatedParams = new URLSearchParams(searchParams);
          updatedParams.set('schema', `tenant_${businessId.replace(/-/g, '_')}`);
          url += `?${updatedParams.toString()}`;
          logger.info(`Converted default_schema to ${updatedParams.get('schema')}`);
        } else {
          url += `?${searchParams.toString()}`;
        }
      } else {
        url += `?${searchParams.toString()}`;
      }
    }
    
    logger.info(`Forwarding GET request to: ${url}`);
    
    // Forward the request
    const response = await axiosInstance.get(url, { headers });
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error('Error in /api/products GET forwarding:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch products', 
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * POST handler that forwards to the inventory/products API
 */
export async function POST(request) {
  try {
    logger.info('API /products POST - Forwarding to /api/inventory/products');
    const data = await request.json();
    
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
    const response = await axiosInstance.post('/api/inventory/products', mappedData, { headers });
    return NextResponse.json(response.data, { status: 201 });
  } catch (error) {
    logger.error('Error in /api/products POST forwarding:', error);
    return NextResponse.json({ 
      error: 'Failed to create product', 
      message: error.message 
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