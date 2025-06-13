import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    const { subscriptionId, plan, billingCycle, paymentIntentId } = await request.json();

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Update the onboarding data with subscription details
    const { error: updateError } = await supabase
      .from('onboarding_data')
      .update({
        subscription_plan: plan,
        billing_cycle: billingCycle,
        stripe_subscription_id: subscriptionId,
        stripe_payment_intent_id: paymentIntentId,
        payment_completed: true,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      logger.error('Error updating onboarding data:', updateError);
      throw updateError;
    }

    // Update the user's metadata to mark onboarding as complete
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
        subscription_plan: plan,
        subscription_status: 'active',
      },
    });

    if (metadataError) {
      logger.error('Error updating user metadata:', metadataError);
    }

    logger.info('Payment completed and onboarding updated:', {
      userId: user.id,
      subscriptionId,
      plan,
      billingCycle,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
    });
  } catch (error) {
    logger.error('Error completing payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete payment' },
      { status: 500 }
    );
  }
}