// src/app/api/onboarding/step4/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      logger.warn('Unauthorized access attempt to step4');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    // Validate workspace setup data
    if (data.createWorkspace) {
      if (!data.workspaceName) {
        return NextResponse.json({
          error: 'Workspace name is required',
          field: 'workspaceName'
        }, { status: 400 });
      }

      // Additional workspace validation
      if (data.inviteTeam && (!data.teamEmails || data.teamEmails.length === 0)) {
        return NextResponse.json({
          error: 'Team member emails are required when inviting team',
          field: 'teamEmails'
        }, { status: 400 });
      }
    }

    // Setup workspace
    try {
      // Add workspace creation logic here
      // const workspace = await createWorkspace({
      //   name: data.workspaceName,
      //   userId: session.user.id,
      //   teamEmails: data.teamEmails
      // });

      // Send team invites if needed
      if (data.inviteTeam && data.teamEmails?.length > 0) {
        // await sendTeamInvites(workspace.id, data.teamEmails);
      }
    } catch (setupError) {
      logger.error('Workspace setup failed:', setupError);
      return NextResponse.json({
        error: 'Failed to setup workspace',
        message: setupError.message
      }, { status: 400 });
    }

    // Complete onboarding
    // await db.user.update({
    //   where: { id: session.user.id },
    //   data: {
    //     onboardingCompleted: true,
    //     onboardingCompletedAt: new Date()
    //   }
    // });

    // Save final step data
    // await db.onboarding.update({
    //   where: { userId: session.user.id },
    //   data: {
    //     ...data,
    //     step: 'complete',
    //     completedAt: new Date()
    //   }
    // });

    logger.info('Onboarding completed for user:', {
      userId: session.user.id,
      workspaceCreated: !!data.createWorkspace
    });

    return NextResponse.json({
      success: true,
      next_step: 'complete',
      data: {
        ...data,
        onboardingCompleted: true
      }
    });

  } catch (error) {
    logger.error('Failed to complete onboarding:', error);
    return NextResponse.json({
      error: 'Server error',
      message: error.message
    }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get saved data (commented until DB is setup)
    // const savedData = await db.onboarding.findFirst({
    //   where: {
    //     userId: session.user.id,
    //     step: 'step4'
    //   }
    // });

    // Get onboarding status
    // const userStatus = await db.user.findUnique({
    //   where: { id: session.user.id },
    //   select: { onboardingCompleted: true }
    // });

    return NextResponse.json({
      success: true,
      data: null, // Replace with savedData
      onboardingCompleted: false // Replace with userStatus?.onboardingCompleted
    });

  } catch (error) {
    logger.error('Failed to get step4 data:', error);
    return NextResponse.json({
      error: 'Failed to retrieve data'
    }, { status: 500 });
  }
}