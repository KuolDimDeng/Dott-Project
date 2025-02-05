import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get onboarding status
    const { data: onboardingStatus, error: onboardingError } = await supabase
      .from('onboarding')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (onboardingError) {
      throw onboardingError
    }

    // Verify all previous steps are completed
    if (!onboardingStatus.business_info_completed ||
        !onboardingStatus.subscription_completed ||
        !onboardingStatus.payment_completed) {
      return NextResponse.json(
        { error: 'Previous steps must be completed first' },
        { status: 400 }
      )
    }

    // Get setup tasks
    const { data: setupTasks, error: tasksError } = await supabase
      .from('setup_tasks')
      .select('*')
      .eq('user_id', session.user.id)

    if (tasksError) {
      throw tasksError
    }

    // Verify all tasks are completed
    if (!setupTasks?.every(task => task.completed)) {
      return NextResponse.json(
        { error: 'All setup tasks must be completed' },
        { status: 400 }
      )
    }

    // Update onboarding status
    const { error: updateError } = await supabase
      .from('onboarding')
      .update({
        setup_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      message: 'Setup completed successfully',
      onboardingStatus: {
        ...onboardingStatus,
        setup_completed: true
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
