// Setup tenant dashboard script
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get input from user
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Connect to the database
async function connectToDatabase() {
  try {
    // Get database connection details from user
    const host = await question('Database host (default: localhost): ') || 'localhost';
    const port = await question('Database port (default: 5432): ') || '5432';
    const database = await question('Database name: ');
    const user = await question('Database username: ');
    const password = await question('Database password: ');

    const client = new Client({
      host,
      port: parseInt(port, 10),
      database,
      user,
      password,
    });

    await client.connect();
    console.log('Connected to database successfully!');
    return client;
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    process.exit(1);
  }
}

// Create the tenant_dashboard table if it doesn't exist
async function createTenantDashboardTable(client) {
  try {
    console.log('Creating tenant_dashboard table if it doesn\'t exist...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenant_dashboard (
        id SERIAL PRIMARY KEY,
        tenant_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        display_order INTEGER NOT NULL,
        configuration JSONB,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Add index if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'idx_tenant_dashboard_tenant_id'
        ) THEN
          CREATE INDEX idx_tenant_dashboard_tenant_id ON public.tenant_dashboard(tenant_id);
        END IF;
      END
      $$;
    `);
    
    console.log('tenant_dashboard table created/verified.');
    return true;
  } catch (error) {
    console.error('Error creating tenant_dashboard table:', error.message);
    return false;
  }
}

// Insert dashboard elements for the tenant
async function insertDashboardElements(client, tenantId) {
  try {
    console.log(`Setting up dashboard elements for tenant: ${tenantId}`);
    
    // Clear existing dashboard elements for this tenant
    await client.query(`
      DELETE FROM public.tenant_dashboard WHERE tenant_id = $1
    `, [tenantId]);
    
    // Insert default dashboard elements for this tenant
    const dashboardElements = [
      {
        type: 'stats',
        title: 'Quick Stats',
        display_order: 1,
        configuration: {
          stats: ['projects', 'tasks', 'team_members'],
          layout: 'grid',
          show_trends: true
        }
      },
      {
        type: 'activity',
        title: 'Recent Activity',
        display_order: 2,
        configuration: {
          show_count: 5,
          activity_types: ['all'],
          show_user: true
        }
      },
      {
        type: 'tasks',
        title: 'Upcoming Tasks',
        display_order: 3,
        configuration: {
          max_items: 5,
          show_due_date: true,
          show_assignee: true
        }
      },
      {
        type: 'chart',
        title: 'Sales Overview',
        display_order: 4,
        configuration: {
          chart_type: 'bar',
          time_period: 'monthly',
          data_source: 'invoices'
        }
      },
      {
        type: 'kpi',
        title: 'Key Performance Indicators',
        display_order: 5,
        configuration: {
          metrics: ['revenue', 'expenses', 'profit_margin', 'customer_count'],
          comparison: 'previous_period'
        }
      }
    ];
    
    // Insert all elements
    for (const element of dashboardElements) {
      await client.query(`
        INSERT INTO public.tenant_dashboard (
          tenant_id, type, title, display_order, configuration
        ) VALUES (
          $1, $2, $3, $4, $5
        )
      `, [
        tenantId,
        element.type,
        element.title,
        element.display_order,
        JSON.stringify(element.configuration)
      ]);
    }
    
    console.log(`Successfully set up dashboard elements for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error(`Error setting up dashboard for tenant ${tenantId}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  let client;
  
  try {
    client = await connectToDatabase();
    
    // Create the tenant_dashboard table
    const tableCreated = await createTenantDashboardTable(client);
    if (!tableCreated) {
      throw new Error('Failed to create tenant_dashboard table');
    }
    
    // Get tenant ID from user
    const tenantId = await question('Enter tenant ID: ');
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    
    // Insert dashboard elements
    const elementsInserted = await insertDashboardElements(client, tenantId);
    if (!elementsInserted) {
      throw new Error(`Failed to insert dashboard elements for tenant ${tenantId}`);
    }
    
    console.log('Setup completed successfully!');
    console.log(`You can now navigate to /${tenantId}/dashboard to see your dashboard.`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
    rl.close();
  }
}

// Run the script
main(); 