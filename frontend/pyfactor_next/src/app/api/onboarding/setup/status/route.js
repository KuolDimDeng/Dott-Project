import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
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

    // Get setup tasks
    const { data: setupTasks, error: tasksError } = await supabase
      .from('setup_tasks')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })

    if (tasksError) {
      throw tasksError
    }

    return NextResponse.json({
      onboardingStatus,
      setupTasks: setupTasks || []
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
