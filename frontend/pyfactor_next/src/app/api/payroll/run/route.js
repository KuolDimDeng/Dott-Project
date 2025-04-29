/**
 * API endpoint for processing payroll runs
 * This API exclusively uses AWS RDS for all operations
 */
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getDbConfigFromEnv } from '@/utils/db-config';
import { createServerLogger } from '@/utils/serverLogger';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { format } from 'date-fns';

// Create logger for this endpoint
const logger = createServerLogger('payroll-run-api');

/**
 * POST handler to run payroll using AWS RDS database
 */
export async function POST(req) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has permission to run payroll
    const hasPermission = 
      user.isOwner || 
      user.permissions?.includes('run_payroll') || 
      await isAuthorizedForPayroll(user.id);
    
    if (!hasPermission) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }
    
    // Parse request body
    const body = await req.json();
    const { 
      start_date, 
      end_date, 
      accounting_period, 
      account_id, 
      employee_ids,
      pay_period_type,
      bi_weekly_start_date
    } = body;
    
    // Validate required parameters
    if (
      (!start_date && !accounting_period && !bi_weekly_start_date) || 
      (!end_date && !accounting_period && !bi_weekly_start_date) || 
      !account_id || 
      !employee_ids || 
      !Array.isArray(employee_ids) || 
      employee_ids.length === 0
    ) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Connect to AWS RDS database
    const dbConfig = getDbConfigFromEnv();
    logger.info('Connecting to AWS RDS database for payroll run');
    const pool = new Pool(dbConfig);
    
    try {
      // Get tenant-specific schema
      const tenantId = user.tenant_id || user.company?.id;
      const schema = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Begin transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 1. Create payroll run record
        const createRunQuery = {
          text: `
            INSERT INTO "${schema}".payroll_runs
              (business_id, tenant_id, run_date, start_date, end_date, 
               accounting_period, status, created_by, created_at, updated_at)
            VALUES
              ($1, $2, CURRENT_DATE, $3, $4, $5, 'processing', $6, NOW(), NOW())
            RETURNING id, status
          `,
          values: [
            tenantId,
            tenantId,
            start_date || null,
            end_date || null,
            accounting_period || null,
            user.id
          ]
        };
        
        const runResult = await client.query(createRunQuery);
        const payrollRunId = runResult.rows[0].id;
        
        // 2. Record bank account info
        const accountQuery = {
          text: `
            UPDATE "${schema}".payroll_runs
            SET account_id = $1
            WHERE id = $2
          `,
          values: [account_id, payrollRunId]
        };
        
        await client.query(accountQuery);
        
        // 3. For each employee, create payroll transaction
        for (const employeeId of employee_ids) {
          // Get employee details including pay rate
          const employeeQuery = {
            text: `
              SELECT 
                id, 
                hourly_rate, 
                salary, 
                pay_type,
                tax_withholding_rate
              FROM "${schema}".employees
              WHERE id = $1
            `,
            values: [employeeId]
          };
          
          const employeeResult = await client.query(employeeQuery);
          if (employeeResult.rows.length === 0) {
            continue; // Skip if employee not found
          }
          
          const employee = employeeResult.rows[0];
          
          // Calculate gross pay (simplified - would be more complex in real app)
          let grossPay = 0;
          
          if (employee.pay_type === 'hourly') {
            // Get hours worked from timesheets
            const hoursQuery = {
              text: `
                SELECT SUM(hours) as total_hours
                FROM "${schema}".timesheets
                WHERE employee_id = $1 
                AND date BETWEEN $2 AND $3
              `,
              values: [
                employeeId, 
                start_date || format(new Date().setDate(1), 'yyyy-MM-dd'),
                end_date || format(new Date(), 'yyyy-MM-dd')
              ]
            };
            
            const hoursResult = await client.query(hoursQuery);
            const totalHours = parseFloat(hoursResult.rows[0]?.total_hours || 0);
            grossPay = totalHours * parseFloat(employee.hourly_rate || 0);
          } else {
            // For salaried employees, calculate portion of monthly salary
            grossPay = parseFloat(employee.salary || 0) / 12; // Monthly salary
            
            // Adjust based on pay period
            if (pay_period_type === 'biweekly') {
              grossPay = (parseFloat(employee.salary || 0) / 26);
            }
          }
          
          // Calculate taxes (simplified)
          const taxRate = parseFloat(employee.tax_withholding_rate || 0.2); // Default 20% if not set
          const taxes = grossPay * taxRate;
          const netPay = grossPay - taxes;
          
          // Create transaction record
          const transactionQuery = {
            text: `
              INSERT INTO "${schema}".payroll_transactions
                (payroll_run_id, employee_id, gross_pay, net_pay, taxes,
                 status, created_at, updated_at)
              VALUES
                ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
              RETURNING id
            `,
            values: [
              payrollRunId,
              employeeId,
              grossPay.toFixed(2),
              netPay.toFixed(2),
              taxes.toFixed(2)
            ]
          };
          
          await client.query(transactionQuery);
        }
        
        // 4. Calculate total amount for the payroll run
        const totalQuery = {
          text: `
            UPDATE "${schema}".payroll_runs
            SET total_amount = (
              SELECT SUM(gross_pay)
              FROM "${schema}".payroll_transactions
              WHERE payroll_run_id = $1
            )
            WHERE id = $1
            RETURNING total_amount
          `,
          values: [payrollRunId]
        };
        
        const totalResult = await client.query(totalQuery);
        
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          payroll_run_id: payrollRunId,
          status: 'processing',
          total_amount: totalResult.rows[0]?.total_amount || 0,
          message: 'Payroll run started successfully'
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
    logger.error('Error running payroll:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Error running payroll: ' + error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if a user is authorized to run payroll
 */
async function isAuthorizedForPayroll(userId) {
  try {
    // This would check the payroll_authorized_users table in a real implementation
    if (!userId) return false;
    
    // Connect to AWS RDS database
    const dbConfig = getDbConfigFromEnv();
    const pool = new Pool(dbConfig);
    
    try {
      const query = {
        text: `
          SELECT COUNT(*) as count
          FROM "public".payroll_authorized_users
          WHERE user_id = $1 AND (is_admin = true OR role = 'User')
        `,
        values: [userId]
      };
      
      const result = await pool.query(query);
      return parseInt(result.rows[0]?.count || 0) > 0;
    } finally {
      await pool.end();
    }
  } catch (error) {
    logger.error('Error checking payroll authorization:', error);
    return false;
  }
} 