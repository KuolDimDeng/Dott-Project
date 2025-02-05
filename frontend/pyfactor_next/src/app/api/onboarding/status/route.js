import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }

    console.log('Checking onboarding status for user:', session.user.id);

    // Get onboarding status
    const { data: onboardingStatus, error: onboardingError } = await supabase
      .from('onboarding')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    console.log('Onboarding status query result:', { status: onboardingStatus, error: onboardingError });

    if (onboardingError && onboardingError.code !== 'PGRST116') {
      console.error('Error fetching onboarding status:', onboardingError);
      return NextResponse.json(
        { error: 'Failed to fetch onboarding status' },
        { status: 500 }
      );
    }

    // If no onboarding status found, return 404 
    // (callback route is responsible for initial creation)
    if (!onboardingStatus) {
      console.log('No onboarding status found for user:', session.user.id);
      return NextResponse.json(
        { error: 'Onboarding status not found' },
        { status: 404 }
      );
    }

    console.log('Returning existing onboarding status:', onboardingStatus);

    return NextResponse.json({
      isComplete: onboardingStatus.setup_completed,
      currentStep: onboardingStatus.current_step,
      ...onboardingStatus
    });
    
  } catch (error) {
    console.error('Error handling onboarding status request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
