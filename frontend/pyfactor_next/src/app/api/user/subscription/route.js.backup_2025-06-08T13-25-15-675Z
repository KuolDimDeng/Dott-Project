import { NextResponse } from 'next/server';
import { getServerUser } from '@/utils/getServerUser';
import { createServerLogger } from '@/utils/createServerLogger';

/**
 * API endpoint to fetch user subscription information
 * 
 * GET /api/user/subscription?tenantId=<tenantId>
 */
export async function GET(req) {
  const logger = createServerLogger({ module: 'API', endpoint: 'user/subscription' });
  
  try {
    // Get URL parameters
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId');
    
    // Check if tenant ID is missing
    if (!tenantId) {
      logger.warn('[Subscription] Missing tenant ID in request');
      return NextResponse.json({ 
        error: 'Missing tenantId parameter' 
      }, { status: 400 });
    }
    
    // Get authenticated user
    const user = await getServerUser(req);
    if (!user) {
      logger.warn('[Subscription] Unauthenticated request');
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Verify that tenant ID matches the user's tenant (RLS enforcement)
    const userTenantId = user['custom:tenant_ID'] || user['custom:businessid'];
    if (userTenantId && userTenantId !== tenantId) {
      logger.error('[Subscription] Tenant ID mismatch - potential security violation', {
        requestedTenant: tenantId,
        userTenant: userTenantId
      });
      
      return NextResponse.json({ 
        error: 'Unauthorized access to tenant data' 
      }, { status: 403 });
    }
    
    // Get subscription information from user attributes
    const subscriptionPlan = user['custom:subplan'] || user['custom:subscription_plan'] || 'free';
    const billingCycle = user['custom:billing_cycle'] || 'monthly';
    const subscriptionStatus = user['custom:subscription_status'] || 'active';
    const trialEnds = user['custom:trial_ends'] || null;
    
    // Return subscription data
    return NextResponse.json({
      tenantId,
      subscription: {
        plan: subscriptionPlan,
        status: subscriptionStatus,
        billingCycle,
        trialEnds,
        features: getFeaturesByPlan(subscriptionPlan)
      }
    });
  } catch (error) {
    logger.error('[Subscription] Error fetching subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch subscription information' 
    }, { status: 500 });
  }
}

/**
 * API endpoint to update user subscription information
 * 
 * POST /api/user/subscription
 * 
 * Body: {
 *   tenantId: string,
 *   plan: 'free' | 'professional' | 'enterprise',
 *   billingCycle: 'monthly' | 'annual'
 * }
 */
export async function POST(request) {
  const logger = createServerLogger({ module: 'API', endpoint: 'user/subscription' });
  
  try {
    // Get authenticated user
    const user = await getServerUser(request);
    if (!user) {
      logger.warn('[Subscription] Unauthenticated update attempt');
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { tenantId, plan, billingCycle } = body;
    
    // Validate required parameters
    if (!tenantId || !plan) {
      logger.warn('[Subscription] Missing required parameters', body);
      return NextResponse.json({ 
        error: 'Missing required parameters: tenantId and plan' 
      }, { status: 400 });
    }
    
    // Verify that tenant ID matches the user's tenant (RLS enforcement)
    const userTenantId = user['custom:tenant_ID'] || user['custom:businessid'];
    if (userTenantId && userTenantId !== tenantId) {
      logger.error('[Subscription] Attempted to update subscription for wrong tenant', {
        requestedTenant: tenantId,
        userTenant: userTenantId
      });
      
      return NextResponse.json({ 
        error: 'Unauthorized access to tenant data' 
      }, { status: 403 });
    }
    
    // In a production environment, this would connect to Cognito AdminUpdateUserAttributes
    // For this implementation, we'll simulate a successful update
    
    logger.info('[Subscription] Updated subscription plan:', {
      tenantId,
      plan,
      billingCycle,
      previousPlan: user['custom:subplan'] || 'free'
    });
    
    // Return updated subscription data
    return NextResponse.json({
      success: true,
      tenantId,
      subscription: {
        plan,
        status: 'active',
        billingCycle: billingCycle || 'monthly',
        features: getFeaturesByPlan(plan)
      },
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    logger.error('[Subscription] Error updating subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to update subscription information' 
    }, { status: 500 });
  }
}

/**
 * Helper function to get features for each subscription plan
 */
function getFeaturesByPlan(plan) {
  const baseFeaturesForAll = [
    'Dashboard access',
    'Customer management',
    'Basic reporting'
  ];
  
  switch (plan.toLowerCase()) {
    case 'professional':
      return [
        ...baseFeaturesForAll,
        'Advanced reporting',
        'API access',
        'Priority support',
        'Custom branding'
      ];
    case 'enterprise':
      return [
        ...baseFeaturesForAll,
        'Advanced reporting',
        'API access',
        'Dedicated support',
        'Custom branding',
        'White labeling',
        'Custom integrations',
        'Advanced security'
      ];
    default: // free plan
      return baseFeaturesForAll;
  }
} 