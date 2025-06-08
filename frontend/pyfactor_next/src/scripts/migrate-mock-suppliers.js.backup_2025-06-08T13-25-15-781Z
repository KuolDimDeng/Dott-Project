/**
 * Script to migrate mock supplier data to the actual database
 * Run this script to ensure any mock supplier data that users may have referenced
 * in products is properly migrated to the database.
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Get the database configuration
function getDatabaseConfig() {
  try {
    const configPath = path.join(process.cwd(), 'db.config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      console.log('[Database] Loaded local database configuration from db.config.json');
      return config;
    }
  } catch (error) {
    console.error('[Database] Error loading local database configuration:', error);
  }

  // Fall back to environment variables
  return {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pyfactor',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

// Create a pool
const pool = new Pool(getDatabaseConfig());

// Generate some representative mock suppliers
function generateMockSuppliers(tenantId) {
  const suppliers = [];
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
  
  for (let i = 0; i < 10; i++) {
    // Generate a deterministic ID pattern similar to mock API
    const mockId = `sup-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    suppliers.push({
      mockId,
      id: uuidv4(), // Real UUID for database
      name: `Supplier ${i + 1}`,
      contact_person: `Contact Person ${i + 1}`,
      email: `supplier${i + 1}@example.com`,
      phone: `555-${String(i).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      address: `${Math.floor(Math.random() * 1000) + 1} Main St, ${city}`,
      tenant_id: tenantId
    });
  }
  
  return suppliers;
}

// Ensure the supplier table exists
async function ensureSupplierTable() {
  const client = await pool.connect();
  try {
    console.log('Ensuring inventory_supplier table exists...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.inventory_supplier (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        mock_id VARCHAR(255), -- Added to track migration from mock IDs
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
      
      -- Add index on tenant_id for better performance with RLS
      CREATE INDEX IF NOT EXISTS idx_inventory_supplier_tenant_id ON public.inventory_supplier(tenant_id);
      
      -- Add index on mock_id for migration lookups
      CREATE INDEX IF NOT EXISTS idx_inventory_supplier_mock_id ON public.inventory_supplier(mock_id);
      
      -- Ensure RLS is enabled
      ALTER TABLE public.inventory_supplier ENABLE ROW LEVEL SECURITY;
    `);
    
    console.log('Inventory supplier table created or verified!');
    
    // Check if the RLS policy exists
    const policyResult = await client.query(`
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename = 'inventory_supplier' AND policyname = 'inventory_supplier_tenant_isolation'
    `);
    
    // Create policy if it doesn't exist
    if (parseInt(policyResult.rows[0].count) === 0) {
      console.log('Creating RLS policy for inventory_supplier...');
      await client.query(`
        CREATE POLICY inventory_supplier_tenant_isolation ON public.inventory_supplier
          USING (
            -- Strict tenant isolation with explicit checks
            tenant_id IS NOT NULL AND
            tenant_id <> '' AND
            tenant_id = current_setting('app.current_tenant_id', TRUE)
          );
      `);
      console.log('RLS policy created!');
    } else {
      console.log('RLS policy already exists.');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring supplier table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Clear any tenant context
async function clearTenantContext(client) {
  await client.query(`RESET ALL`);
  await client.query(`SET app.current_tenant_id TO ''`);
}

// Set the tenant context for a session
async function setTenantContext(client, tenantId) {
  await client.query(`RESET ALL`);
  await client.query(`SET LOCAL app.current_tenant_id TO '${tenantId}'`);
  
  // Verify setting
  const result = await client.query(`SELECT current_setting('app.current_tenant_id', false) as tenant_id`);
  if (result.rows[0].tenant_id !== tenantId) {
    throw new Error(`Failed to set tenant context. Expected ${tenantId} but got ${result.rows[0].tenant_id}`);
  }
}

// Migrate mock suppliers to database for a tenant
async function migrateMockSuppliersForTenant(tenantId) {
  const client = await pool.connect();
  
  try {
    console.log(`\nMigrating mock suppliers for tenant ${tenantId}...`);
    
    // Enter tenant context for this tenant
    await setTenantContext(client, tenantId);
    
    // Check how many suppliers exist for this tenant
    const countResult = await client.query(
      'SELECT COUNT(*) FROM inventory_supplier WHERE tenant_id = $1', 
      [tenantId]
    );
    
    const existingCount = parseInt(countResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`Tenant ${tenantId} already has ${existingCount} suppliers. Skipping migration.`);
      return;
    }
    
    // Generate mock suppliers that would have been used by the app
    const mockSuppliers = generateMockSuppliers(tenantId);
    
    // Insert each supplier
    for (const supplier of mockSuppliers) {
      await client.query(`
        INSERT INTO inventory_supplier (
          id, tenant_id, name, contact_person, email, phone, address, mock_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO NOTHING
      `, [
        supplier.id,
        tenantId,
        supplier.name,
        supplier.contact_person,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.mockId
      ]);
    }
    
    console.log(`Successfully migrated ${mockSuppliers.length} mock suppliers for tenant ${tenantId}`);
    
    // Check if any products reference supplier_id and update them
    const productsResult = await client.query(
      'SELECT COUNT(*) FROM inventory_product WHERE tenant_id = $1 AND supplier_id IS NOT NULL', 
      [tenantId]
    );
    
    const productsWithSupplier = parseInt(productsResult.rows[0].count);
    
    if (productsWithSupplier > 0) {
      console.log(`Found ${productsWithSupplier} products with supplier references. Updating to use UUID supplier IDs...`);
      
      // Get a list of mock suppliers for mapping
      const insertedSuppliers = await client.query(
        'SELECT id, mock_id FROM inventory_supplier WHERE tenant_id = $1',
        [tenantId]
      );
      
      // Create a mapping of mock IDs to real UUIDs
      const supplierMap = {};
      for (const supplier of insertedSuppliers.rows) {
        if (supplier.mock_id) {
          supplierMap[supplier.mock_id] = supplier.id;
        }
      }
      
      // Use the first supplier as fallback if needed
      const fallbackSupplier = insertedSuppliers.rows[0]?.id;
      
      // Update products to use the real supplier IDs
      if (Object.keys(supplierMap).length > 0) {
        // Get products with supplier_id
        const products = await client.query(
          'SELECT id, supplier_id FROM inventory_product WHERE tenant_id = $1 AND supplier_id IS NOT NULL',
          [tenantId]
        );
        
        for (const product of products.rows) {
          const mockSupplierId = product.supplier_id;
          // Find matching real supplier or use fallback
          const realSupplierId = supplierMap[mockSupplierId] || fallbackSupplier;
          
          if (realSupplierId) {
            await client.query(
              'UPDATE inventory_product SET supplier_id = $1 WHERE id = $2',
              [realSupplierId, product.id]
            );
          }
        }
        
        console.log(`Updated supplier references for ${products.rows.length} products`);
      }
    }
    
    return mockSuppliers.length;
  } catch (error) {
    console.error(`Error migrating suppliers for tenant ${tenantId}:`, error);
    throw error;
  } finally {
    // Clear tenant context
    await clearTenantContext(client);
    client.release();
  }
}

// Find all tenants in the system
async function getAllTenants() {
  try {
    console.log('Finding all tenants in the system...');
    
    // Query the product table to find all unique tenant IDs
    const result = await pool.query(`
      SELECT DISTINCT tenant_id FROM inventory_product
      UNION
      SELECT DISTINCT tenant_id FROM inventory_supplier
    `);
    
    const tenantIds = result.rows.map(row => row.tenant_id);
    console.log(`Found ${tenantIds.length} tenants: ${tenantIds.join(', ')}`);
    
    return tenantIds;
  } catch (error) {
    console.error('Error finding tenants:', error);
    return [];
  }
}

// Main migration function
async function migrateAllMockSuppliers() {
  try {
    console.log('Starting mock supplier migration...');
    
    // Ensure the table exists
    await ensureSupplierTable();
    
    // Get all tenant IDs
    const tenantIds = await getAllTenants();
    
    if (tenantIds.length === 0) {
      console.log('No tenants found. Creating example tenant with UUID for testing.');
      tenantIds.push(uuidv4());
    }
    
    // Migrate for each tenant
    let totalMigrated = 0;
    for (const tenantId of tenantIds) {
      if (tenantId) {
        const count = await migrateMockSuppliersForTenant(tenantId);
        if (count) totalMigrated += count;
      }
    }
    
    console.log(`\nMigration complete! Migrated ${totalMigrated} mock suppliers to the database.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
migrateAllMockSuppliers(); 