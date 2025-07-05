import { NextResponse } from 'next/server';
import { withDatabase } from '@/lib/db-utils';

/**
 * POST handler to update the database schema for account recovery
 * This is an admin-only API that should only be run once
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { adminKey } = body;
    
    // Simple admin key check - in a real app, use proper authentication
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    return await withDatabase(async (client) => {
      // Begin a transaction
      await client.query('BEGIN');
      
      try {
        // Check if columns exist and add them if they don't
        
        // 1. First check if the deactivated_at column exists
        const deactivatedColExists = await columnExists(client, 'custom_auth_tenant', 'deactivated_at');
        if (!deactivatedColExists) {
          await client.query(`
            ALTER TABLE custom_auth_tenant 
            ADD COLUMN deactivated_at TIMESTAMP WITH TIME ZONE
          `);
          console.log('Added deactivated_at column');
        }
        
        // 2. Check if the reactivated_at column exists
        const reactivatedColExists = await columnExists(client, 'custom_auth_tenant', 'reactivated_at');
        if (!reactivatedColExists) {
          await client.query(`
            ALTER TABLE custom_auth_tenant 
            ADD COLUMN reactivated_at TIMESTAMP WITH TIME ZONE
          `);
          console.log('Added reactivated_at column');
        }
        
        // 3. Check if the is_recoverable column exists
        const recoverableColExists = await columnExists(client, 'custom_auth_tenant', 'is_recoverable');
        if (!recoverableColExists) {
          await client.query(`
            ALTER TABLE custom_auth_tenant 
            ADD COLUMN is_recoverable BOOLEAN DEFAULT TRUE
          `);
          console.log('Added is_recoverable column');
        }
        
        // 4. Create the account_reactivations table if it doesn't exist
        await client.query(`
          CREATE TABLE IF NOT EXISTS account_reactivations (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            tenant_id UUID NOT NULL,
            deactivated_at TIMESTAMP WITH TIME ZONE,
            reactivated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            cognito_enabled BOOLEAN DEFAULT FALSE
          )
        `);
        
        // Commit the transaction
        await client.query('COMMIT');
        
        return NextResponse.json({
          success: true,
          message: 'Database schema updated successfully'
        });
      } catch (error) {
        // Rollback on error
        await client.query('ROLLBACK');
        throw error;
      }
    });
  } catch (error) {
    console.error('[API] Schema update error:', error);
    
    return NextResponse.json({
      success: false, 
      error: 'Failed to update database schema', 
      message: error.message || String(error)
    }, { status: 500 });
  }
}

// Helper function to check if a column exists
async function columnExists(client, table, column) {
  const result = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  `, [table, column]);
  
  return result.rows.length > 0;
} 