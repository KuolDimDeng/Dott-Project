// src/app/api/onboarding/step2/route.js
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { logger } from "@/utils/logger";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { z } from "zod";

// Enhanced validation schema
const step2Schema = z.object({
    selectedPlan: z.enum(['Basic', 'Professional'], {
        required_error: "Plan selection is required",
        invalid_type_error: "Invalid plan type"
    }),
    billingCycle: z.enum(['monthly', 'annual'], {
        required_error: "Billing cycle is required",
        invalid_type_error: "Invalid billing cycle"
    }),
    timestamp: z.number().optional()
}).strict(); // Add strict() to catch unexpected fields

export async function POST(req) {
    try {
        // Session validation
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            logger.warn('Unauthorized attempt to save step2');
            return NextResponse.json(
                { 
                    error: 'UNAUTHORIZED',
                    message: 'Please sign in to continue'
                }, 
                { status: 401 }
            );
        }

        // Parse and log request body
        let rawData;
        try {
            rawData = await req.json();
            logger.debug('Received step2 data:', rawData);
        } catch (error) {
            logger.error('Failed to parse request body:', error);
            return NextResponse.json({
                error: 'INVALID_REQUEST',
                message: 'Invalid request format'
            }, { status: 400 });
        }

        // Validate data
        const validationResult = step2Schema.safeParse(rawData);
        
        if (!validationResult.success) {
            logger.warn('Step2 validation failed:', {
                userId: session.user.id,
                errors: validationResult.error.format(),
                receivedData: rawData
            });
            return NextResponse.json({
                error: 'VALIDATION_ERROR',
                message: 'Invalid plan selection data',
                details: validationResult.error.format()
            }, { status: 400 });
        }

        const data = validationResult.data;
        
        // Log successful validation
        logger.info('Step2 data validated:', {
            userId: session.user.id,
            plan: data.selectedPlan,
            billingCycle: data.billingCycle
        });

        // Determine next step
        const nextStep = data.selectedPlan === 'Basic' ? 'step4' : 'step3';
        
        // Return success response
        return NextResponse.json({
            success: true,
            message: 'Plan selection saved successfully',
            next_step: nextStep,
            data: {
                ...data,
                userId: session.user.id,
                updatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Failed to process step2:', {
            error,
            stack: error.stack
        });
        return NextResponse.json({
            error: 'SERVER_ERROR',
            message: 'Failed to save your plan selection'
        }, { status: 500 });
    }
}