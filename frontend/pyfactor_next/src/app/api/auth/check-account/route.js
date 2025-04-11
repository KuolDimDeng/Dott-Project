import { NextResponse } from 'next/server';
import { withDatabase } from '@/lib/db-utils';

/**
 * POST handler to check if an email belongs to a previously deactivated account
 * Used during signup to identify returning users
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing email' 
      }, { status: 400 });
    }
    
    console.info('[API] Checking for existing account with email:', email);
    
    // Use our withDatabase utility to handle the database operation
    return await withDatabase(async (client) => {
      // Check if the email is associated with any tenant (active or inactive)
      const userResult = await client.query(`
        SELECT u.id, t.id as tenant_id, t.name, t.is_active, t.deactivated_at, t.is_recoverable
        FROM "user" u
        JOIN custom_auth_tenant t ON u.tenant_id = t.id
        WHERE u.email = $1
        ORDER BY t.deactivated_at DESC
        LIMIT 1
      `, [email]);
      
      if (userResult.rows.length === 0) {
        // No account found with this email
        return NextResponse.json({
          success: true,
          exists: false,
          message: 'No account found with this email'
        });
      }
      
      const account = userResult.rows[0];
      
      if (account.is_active) {
        // Account exists and is active
        return NextResponse.json({
          success: true,
          exists: true,
          active: true,
          message: 'An active account already exists with this email'
        });
      }
      
      if (!account.is_recoverable) {
        // Account exists but is not recoverable
        return NextResponse.json({
          success: true,
          exists: true,
          active: false,
          recoverable: false,
          message: 'A previously deactivated account exists but is not recoverable'
        });
      }
      
      // Account exists, is inactive, and is recoverable
      return NextResponse.json({
        success: true,
        exists: true,
        active: false,
        recoverable: true,
        tenantId: account.tenant_id,
        userId: account.id,
        deactivatedAt: account.deactivated_at,
        message: 'A recoverable deactivated account was found with this email'
      });
    });
  } catch (error) {
    console.error('[API] Error checking account:', error.message || String(error));
    
    return NextResponse.json({
      success: false, 
      error: 'Error checking account', 
      message: error.message || String(error)
    }, { status: 500 });
  }
} 