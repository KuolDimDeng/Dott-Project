import { NextResponse } from 'next/server';
import { getSession } from '@/utils/session';
import { updateUserAttributes } from '@/lib/cognito';
import { logger } from '@/utils/logger';

/**
 * API route to migrate user data from cookies/localStorage to Cognito attributes
 * 
 * @param {Request} request - The incoming request object
 */
export async function POST(request) {
  try {
    // Verify the user is authenticated
    const session = await getSession();
    
    if (!session || !session.user) {
      logger.error('[API] migrate-to-cognito: User not authenticated');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Get the user ID from the session
    const userId = session.user.sub;
    
    // Extract data to migrate from the request body
    const dataToMigrate = await request.json();
    
    if (!dataToMigrate || Object.keys(dataToMigrate).length === 0) {
      logger.info('[API] migrate-to-cognito: No attributes to migrate', { userId });
      return NextResponse.json(
        { message: 'No attributes to migrate', success: true },
        { status: 200 }
      );
    }
    
    logger.info('[API] migrate-to-cognito: Migrating user data to Cognito', {
      userId,
      attributesToMigrate: Object.keys(dataToMigrate)
    });
    
    // Format attributes for Cognito (all custom attributes must be prefixed with 'custom:')
    const cognitoAttributes = Object.entries(dataToMigrate).reduce((acc, [key, value]) => {
      // Skip null or undefined values
      if (value === null || value === undefined) return acc;
      
      // Ensure custom attributes have the 'custom:' prefix
      const attrKey = key.startsWith('custom:') ? key : `custom:${key}`;
      
      // Convert values to strings as required by Cognito
      acc[attrKey] = typeof value === 'string' ? value : JSON.stringify(value);
      
      return acc;
    }, {});
    
    // Update user attributes in Cognito
    await updateUserAttributes(userId, cognitoAttributes);
    
    return NextResponse.json(
      { message: 'Data successfully migrated to Cognito', success: true },
      { status: 200 }
    );
  } catch (error) {
    logger.error('[API] migrate-to-cognito: Error during migration', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Failed to migrate data to Cognito', message: error.message },
      { status: 500 }
    );
  }
} 