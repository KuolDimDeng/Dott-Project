import { NextResponse } from 'next/server';
import { createDbPool } from '../db-config';
import { getJwtFromRequest } from '@/utils/auth/authUtils';

/**
 * API route to set up dashboard elements for a tenant
 */
export async function POST(request) {
  const requestId = Date.now().toString(36);
  let pool = null;
  let client = null;

  try {
    // Parse request body
    const body = await request.json();
    const { tenantId } = body;
    
    console.log(`[${requestId}] Setting up dashboard for tenant ID: ${tenantId}`);
    
    if (!tenantId) {
      console.warn(`[${requestId}] Missing tenant ID parameter`);
      return NextResponse.json({
        success: false,
        message: 'Missing tenant ID parameter'
      }, { status: 400 });
    }
    
    // Connect to database
    try {
      pool = await createDbPool();
      client = await pool.connect();
      console.log(`[${requestId}] Database connection successful`);
    } catch (dbError) {
      console.error(`[${requestId}] Database connection error:`, dbError);
      return NextResponse.json({
        success: false,
        message: `Database connection failed: ${dbError.message}`
      }, { status: 500 });
    }
    
    // Check if tenant exists
    const tenantCheckResult = await client.query(`
      SELECT * FROM public.custom_auth_tenant WHERE id = $1
    `, [tenantId]);
    
    if (tenantCheckResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tenant not found'
      }, { status: 404 });
    }

    // Create tenant_dashboard table if it doesn't exist
    try {
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
      
      console.log(`[${requestId}] Ensured tenant_dashboard table exists`);
    } catch (tableError) {
      console.error(`[${requestId}] Error creating table:`, tableError);
      return NextResponse.json({
        success: false,
        message: `Error creating tenant_dashboard table: ${tableError.message}`
      }, { status: 500 });
    }
    
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
    
    console.log(`[${requestId}] Successfully set up dashboard elements for tenant ${tenantId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Dashboard elements created successfully',
      elements: dashboardElements
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error setting up dashboard:`, error);
    
    return NextResponse.json({
      success: false,
      message: `Failed to set up dashboard: ${error.message}`
    }, { status: 500 });
    
  } finally {
    // Release database resources
    if (client) {
      try {
        client.release();
        console.log(`[${requestId}] Database client released`);
      } catch (releaseError) {
        console.error(`[${requestId}] Error releasing client:`, releaseError);
      }
    }
  }
} 