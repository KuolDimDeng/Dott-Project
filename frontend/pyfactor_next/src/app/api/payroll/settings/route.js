/**
 * API endpoint for handling payroll settings
 * This API exclusively uses AWS RDS for all operations
 */
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfigFromEnv } from '@/utils/db-config';
import { createServerLogger } from '@/utils/serverLogger';
import { getAuthenticatedUser } from '@/lib/auth-utils';

// Create logger for this endpoint
const logger = createServerLogger('payroll-settings-api');

/**
 * GET handler to retrieve payroll settings from AWS RDS
 */
export async function GET(req) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission to view payroll settings
    if (!user.isOwner && !user.permissions?.includes('view_payroll_settings')) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Connect to AWS RDS database
    const dbConfig = getDbConfigFromEnv();
    logger.info('Connecting to AWS RDS database for payroll settings');
    const pool = new Pool(dbConfig);
    
    try {
      // Get tenant-specific schema
      const tenantId = user.tenant_id || user.company?.id;
      const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Query to get payroll settings
      const settingsQuery = {
        text: `
          SELECT *
          FROM "${schema}".payroll_settings
          WHERE tenant_id = $1
          LIMIT 1
        `,
        values: [tenantId]
      };
      
      // Query to get authorized users
      const usersQuery = {
        text: `
          SELECT 
            u.id,
            u.first_name || ' ' || u.last_name as name,
            pu.role,
            pu.is_admin
          FROM "${schema}".payroll_authorized_users pu
          JOIN "${schema}".users u ON pu.user_id = u.id
          WHERE pu.tenant_id = $1
        `,
        values: [tenantId]
      };
      
      // Execute queries in parallel
      const [settingsResult, usersResult] = await Promise.all([
        pool.query(settingsQuery),
        pool.query(usersQuery)
      ]);
      
      // Process settings data
      const settings = settingsResult.rows[0] || {};
      const authorizedUsers = usersResult.rows || [];
      
      // Build response
      const response = {
        taxInfo: {
          ein: settings.ein || '',
          taxId: settings.tax_id || '',
          stateTaxId: settings.state_tax_id || '',
          localTaxId: settings.local_tax_id || ''
        },
        payrollAdmin: settings.payroll_admin_id || null,
        authorizedUsers,
        payPeriodType: settings.pay_period_type || 'monthly',
        payFrequency: settings.pay_frequency || 'BIWEEKLY'
      };
      
      return NextResponse.json(response);
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error('Error fetching payroll settings:', error);
    return NextResponse.json(
      { message: 'Error fetching payroll settings: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST handler to save payroll settings to AWS RDS
 */
export async function POST(req) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission to edit payroll settings
    if (!user.isOwner && !user.permissions?.includes('edit_payroll_settings')) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    const { authorizedUsers, payrollAdmin, taxInfo, businessCountry, payPeriodType } = body;
    
    // Connect to AWS RDS database
    const dbConfig = getDbConfigFromEnv();
    logger.info('Connecting to AWS RDS database to save payroll settings');
    const pool = new Pool(dbConfig);
    
    try {
      // Get tenant-specific schema
      const tenantId = user.tenant_id || user.company?.id;
      const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Begin transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Update or insert payroll settings
        const upsertSettingsQuery = {
          text: `
            INSERT INTO "${schema}".payroll_settings
              (tenant_id, ein, tax_id, state_tax_id, local_tax_id, 
               payroll_admin_id, pay_period_type, pay_frequency, business_country,
               updated_at, updated_by)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
            ON CONFLICT (tenant_id)
            DO UPDATE SET
              ein = $2,
              tax_id = $3,
              state_tax_id = $4,
              local_tax_id = $5,
              payroll_admin_id = $6,
              pay_period_type = $7,
              pay_frequency = $8,
              business_country = $9,
              updated_at = NOW(),
              updated_by = $10
            RETURNING id
          `,
          values: [
            tenantId,
            taxInfo?.ein || null,
            taxInfo?.taxId || null,
            taxInfo?.stateTaxId || null,
            taxInfo?.localTaxId || null,
            payrollAdmin || null,
            payPeriodType || 'monthly',
            'BIWEEKLY', // Default pay frequency
            businessCountry || 'US',
            user.id
          ]
        };
        
        await client.query(upsertSettingsQuery);
        
        // Clear existing authorized users
        await client.query(`
          DELETE FROM "${schema}".payroll_authorized_users
          WHERE tenant_id = $1
        `, [tenantId]);
        
        // Insert new authorized users
        if (authorizedUsers && authorizedUsers.length > 0) {
          const userValues = authorizedUsers.map((user, index) => {
            return `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`;
          }).join(', ');
          
          const userParams = [tenantId];
          authorizedUsers.forEach(user => {
            userParams.push(user.id, user.role || 'User', user.isAdmin || false, user.name || 'Unknown');
          });
          
          await client.query(`
            INSERT INTO "${schema}".payroll_authorized_users
              (tenant_id, user_id, role, is_admin, display_name)
            VALUES
              ${userValues}
          `, userParams);
        }
        
        await client.query('COMMIT');
        
        return NextResponse.json({ 
          success: true,
          message: 'Payroll settings saved successfully' 
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error('Error saving payroll settings:', error);
    return NextResponse.json(
      { message: 'Error saving payroll settings: ' + error.message },
      { status: 500 }
    );
  }
} 