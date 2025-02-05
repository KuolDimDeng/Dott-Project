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
    const businessData = await request.json()

    // Create/update business record
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert([{
        ...businessData,
        user_id: user.id
      }])
      .select()
      .single()

    if (businessError) throw businessError

    // Update onboarding status
    const { error: statusError } = await supabase
      .from('onboarding')
      .upsert({
        user_id: user.id,
        business_info_completed: true,
        current_step: 'subscription'
      })

    if (statusError) throw statusError

    return NextResponse.json({ 
      success: true,
      business,
      message: 'Business information saved successfully'
    })

  } catch (error) {
    console.error('Error saving business info:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to save business information'
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

    // Get business data
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (businessError && businessError.code !== 'PGRST116') throw businessError

    return NextResponse.json({ 
      success: true,
      business: business || null
    })

  } catch (error) {
    console.error('Error fetching business info:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch business information'
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

    // Update business record
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (businessError) throw businessError

    return NextResponse.json({ 
      success: true,
      business,
      message: 'Business information updated successfully'
    })

  } catch (error) {
    console.error('Error updating business info:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update business information'
      },
      { status: 500 }
    )
  }
}
