'use server';

import { NextResponse } from 'next/server';
import * as db from '@/utils/db/database';
import { extractTenantId } from '@/utils/auth/tenant';

export async function GET(request) {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  
  try {
    // Extract tenant info
    const { tenantId, businessId, tokenTenantId } = await extractTenantId(request);
    const finalTenantId = tenantId || businessId || tokenTenantId || 
      request.nextUrl.searchParams.get('tenantId');
    
    if (!finalTenantId) {
      return NextResponse.json({
        error: 'No tenant ID found',
        message: 'Please provide a tenant ID in the request'
      }, { status: 400 });
    }
    
    // Format tenant schema name
    const schemaName = `tenant_${finalTenantId.replace(/-/g, '_')}`;
    
    console.log(`[${requestId}] Creating database tables for tenant: ${finalTenantId}`);
    
    // Get a client for transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Step 1: Ensure the public schema exists
      const createPublicSchemaQuery = `
        CREATE SCHEMA IF NOT EXISTS public
      `;
      await client.query(createPublicSchemaQuery);
      
      // Step 2: Create the inventory_product table in public schema
      const createInventoryProductTableQuery = `
        CREATE TABLE IF NOT EXISTS public.inventory_product (
          id UUID PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          sku VARCHAR(255),
          price NUMERIC(15, 2) DEFAULT 0,
          cost NUMERIC(15, 2) DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE
        )
      `;
      await client.query(createInventoryProductTableQuery);
      
      // Step 3: Create the tenant schema
      const createTenantSchemaQuery = `
        CREATE SCHEMA IF NOT EXISTS "${schemaName}"
      `;
      await client.query(createTenantSchemaQuery);
      
      // Step 4: Create the tenant-specific products table
      const createTenantProductsTableQuery = `
        CREATE TABLE IF NOT EXISTS "${schemaName}".products (
          id UUID PRIMARY KEY,
          product_name VARCHAR(255) NOT NULL,
          description TEXT,
          sku VARCHAR(255),
          price NUMERIC(15, 2) DEFAULT 0,
          unit VARCHAR(50),
          tenant_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await client.query(createTenantProductsTableQuery);
      
      // Step 5: Create the tenant-specific product table (singular)
      const createTenantProductTableQuery = `
        CREATE TABLE IF NOT EXISTS "${schemaName}".product (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC(15, 2) DEFAULT 0,
          tenant_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await client.query(createTenantProductTableQuery);
      
      // Step 6: Create the sales_product table in public schema
      const createSalesProductTableQuery = `
        CREATE TABLE IF NOT EXISTS public.sales_product (
          id UUID PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          inventory_product_id UUID REFERENCES public.inventory_product(id),
          sale_price NUMERIC(15, 2) DEFAULT 0,
          quantity INTEGER DEFAULT 0,
          sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          customer_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      await client.query(createSalesProductTableQuery);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      console.log(`[${requestId}] Database tables created successfully for tenant: ${finalTenantId}`);
      
      return NextResponse.json({
        message: 'Database tables created successfully',
        tenantId: finalTenantId,
        schema: schemaName,
        tables: [
          'public.inventory_product',
          'public.sales_product',
          `${schemaName}.products`,
          `${schemaName}.product`
        ]
      });
      
    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      console.error(`[${requestId}] Error creating database tables:`, error);
      
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error in create-tables API:`, error);
    
    return NextResponse.json({
      error: 'Failed to create database tables',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 