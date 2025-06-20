import { NextResponse } from 'next/server';
import { clearCache } from '@/utils/sessionManager-v2-enhanced';

export async function POST(request) {
  try {
    console.log('[Clear Cache] Clearing session cache');
    
    // Clear the session cache
    await clearCache();
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Session cache cleared successfully'
    });
  } catch (error) {
    console.error('[Clear Cache] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  // Also support GET for easy browser testing
  return POST(request);
}