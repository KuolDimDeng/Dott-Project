import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError

    // Get the request body
    const paymentData = await request.json()

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (businessError) throw businessError

    // Update subscription status to active
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: paymentData.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default to 30 days
      })
      .eq('business_id', business.id)

    if (subscriptionError) throw subscriptionError

    // Update onboarding status
    const { error: statusError } = await supabase
      .from('onboarding')
      .update({
        payment_completed: true,
        current_step: 'setup'
      })
      .eq('user_id', user.id)

    if (statusError) throw statusError

    // Start background setup tasks (this will be handled by webhooks/background jobs)
    // Here we just mark the step as completed and move to setup phase

    return NextResponse.json({ 
      success: true,
      message: 'Payment processed successfully'
    })

  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process payment'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError

    // Get onboarding status
    const { data: status, error: statusError } = await supabase
      .from('onboarding')
      .select('payment_completed')
      .eq('user_id', user.id)
      .single()

    if (statusError) throw statusError

    return NextResponse.json({ 
      success: true,
      paymentCompleted: status?.payment_completed || false
    })

  } catch (error) {
    console.error('Error checking payment status:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to check payment status'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError

    // Get the request body
    const updates = await request.json()

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (businessError) throw businessError

    // Update payment-related information
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('business_id', business.id)

    if (subscriptionError) throw subscriptionError

    return NextResponse.json({ 
      success: true,
      message: 'Payment information updated successfully'
    })

  } catch (error) {
    console.error('Error updating payment information:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update payment information'
      },
      { status: 500 }
    )
  }
}
