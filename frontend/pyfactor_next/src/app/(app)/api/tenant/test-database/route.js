/**
 * API endpoint to test AWS RDS database connection
 */
import { testDbConnection } from '../db-config';
import { NextResponse } from 'next/server';

/**
 * GET handler for database connection testing
 */
export async function GET(request) {
  try {
    console.log('Testing AWS RDS database connection...');
    const results = await testDbConnection();
    
    return NextResponse.json(results, { 
      status: results.success ? 200 : 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Error testing database connection:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}