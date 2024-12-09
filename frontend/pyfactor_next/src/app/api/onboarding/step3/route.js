// src/app/api/onboarding/step3/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      logger.warn('Unauthorized access attempt to step3');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    // Validate payment only for Professional/Enterprise plans
    if (data.selectedPlan !== 'Basic') {
      if (!data.paymentMethod) {
        return NextResponse.json({
          error: 'Payment method is required for paid plans',
          field: 'paymentMethod'
        }, { status: 400 });
      }

      // Additional payment validation
      if (data.paymentMethod === 'card') {
        if (!data.cardDetails?.token) {
          return NextResponse.json({
            error: 'Invalid card details',
            field: 'cardDetails'
          }, { status: 400 });
        }
      }
    }

    // Process payment if needed
    if (data.selectedPlan !== 'Basic') {
      try {
        // Add payment processing logic here
        // const paymentResult = await processPayment(data.paymentMethod, data.cardDetails);
      } catch (paymentError) {
        logger.error('Payment processing failed:', paymentError);
        return NextResponse.json({
          error: 'Payment processing failed',
          message: paymentError.message
        }, { status: 400 });
      }
    }

    // Save to database (commented until DB is setup)
    // await db.onboarding.update({
    //   where: { userId: session.user.id },
    //   data: {
    //     ...data,
    //     step: 'step3',
    //     completedAt: new Date()
    //   }
    // });

    logger.info('Step 3 completed for user:', {
      userId: session.user.id,
      plan: data.selectedPlan
    });

    return NextResponse.json({
      success: true,
      next_step: 'step4',
      data: {
        ...data,
        paymentStatus: data.selectedPlan === 'Basic' ? 'not_required' : 'completed'
      }
    });

  } catch (error) {
    logger.error('Failed to save step3:', error);
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
    //     step: 'step3'
    //   }
    // });

    return NextResponse.json({
      success: true,
      data: null // Replace with savedData when DB is setup
    });

  } catch (error) {
    logger.error('Failed to get step3 data:', error);
    return NextResponse.json({
      error: 'Failed to retrieve data'
    }, { status: 500 });
  }
}