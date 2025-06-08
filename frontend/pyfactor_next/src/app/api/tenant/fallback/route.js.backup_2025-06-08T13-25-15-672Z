import { NextResponse } from 'next/server';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { isValidUUID } from '@/utils/tenantUtils';

/**
 * Fallback API endpoint for tenant creation and retrieval
 * This serves as a client-side fallback when the actual API is unavailable
 */

// Namespace for deterministic UUID generation
const NAMESPACE = '74738ff5-5367-5958-9aee-98fffdcd1876';

// Generate a deterministic UUID from input
const generateDeterministicId = (input) => {
  try {
    // If input is already a valid UUID, return it
    if (isValidUUID(input)) {
      return input;
    }
    
    // Generate a deterministic ID based on input
    const normalizedInput = String(input).toLowerCase().trim();
    return uuidv5(normalizedInput, NAMESPACE);
  } catch (error) {
    console.error('[Tenant Fallback API] Error generating deterministic ID:', error);
    // Fall back to random UUID
    return uuidv4();
  }
};

// POST handler for tenant creation/retrieval
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { tenantId, businessId, userId, email } = body;
    
    // Determine effective tenant ID
    let effectiveTenantId = tenantId;
    
    // If no valid tenant ID provided, try to generate one
    if (!effectiveTenantId || !isValidUUID(effectiveTenantId)) {
      // Try businessId first if available
      if (businessId) {
        effectiveTenantId = generateDeterministicId(businessId);
      } 
      // Use userId as fallback
      else if (userId) {
        effectiveTenantId = generateDeterministicId(userId);
      }
      // Use email as last resort
      else if (email) {
        effectiveTenantId = generateDeterministicId(email);
      }
      // Generate random UUID if nothing available
      else {
        effectiveTenantId = uuidv4();
      }
    }
    
    // Log the operation
    console.log('[Tenant Fallback API] Created/retrieved tenant:', effectiveTenantId);
    
    // Return the tenant information with creation details
    return NextResponse.json({
      success: true,
      fallback: true,
      tenant: {
        id: effectiveTenantId,
        created: new Date().toISOString(),
        status: 'active',
        source: 'fallback-api'
      },
      message: 'Tenant created/retrieved via fallback API'
    });
  } catch (error) {
    console.error('[Tenant Fallback API] Error processing request:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error processing tenant request',
      message: error.message
    }, { status: 500 });
  }
}

// GET handler for tenant retrieval
export async function GET(request) {
  try {
    // Extract tenant ID from URL or query
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing tenantId parameter'
      }, { status: 400 });
    }
    
    // Validate tenant ID
    if (!isValidUUID(tenantId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid tenant ID format'
      }, { status: 400 });
    }
    
    // Return basic tenant information
    return NextResponse.json({
      success: true,
      fallback: true,
      tenant: {
        id: tenantId,
        created: new Date().toISOString(),
        status: 'active',
        source: 'fallback-api'
      }
    });
  } catch (error) {
    console.error('[Tenant Fallback API] Error processing GET request:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error retrieving tenant',
      message: error.message
    }, { status: 500 });
  }
} 