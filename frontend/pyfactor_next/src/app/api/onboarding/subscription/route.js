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
    const subscriptionData = await request.json()

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (businessError) throw businessError

    // Create subscription record
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert([{
        ...subscriptionData,
        business_id: business.id,
        status: 'pending' // Will be updated to 'active' after payment
      }])
      .select()
      .single()

    if (subscriptionError) throw subscriptionError

    // Update onboarding status
    const { error: statusError } = await supabase
      .from('onboarding')
      .update({
        subscription_completed: true,
        current_step: 'payment'
      })
      .eq('user_id', user.id)

    if (statusError) throw statusError

    return NextResponse.json({ 
      success: true,
      subscription,
      message: 'Subscription created successfully'
    })

  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create subscription'
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

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (businessError) throw businessError

    // Get subscription data
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .single()

    if (subscriptionError && subscriptionError.code !== 'PGRST116') throw subscriptionError

    return NextResponse.json({ 
      success: true,
      subscription: subscription || null
    })

  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch subscription'
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

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (businessError) throw businessError

    // Get the request body
    const updates = await request.json()

    // Update subscription record
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('business_id', business.id)
      .select()
      .single()

    if (subscriptionError) throw subscriptionError

    return NextResponse.json({ 
      success: true,
      subscription,
      message: 'Subscription updated successfully'
    })

  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update subscription'
      },
      { status: 500 }
    )
  }
}
