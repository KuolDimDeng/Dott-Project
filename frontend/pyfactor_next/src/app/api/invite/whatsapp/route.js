import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

/**
 * Send WhatsApp invitation to a business owner
 * POST /api/invite/whatsapp
 */
export async function POST(request) {
  try {
    const { phoneNumber, message, senderName, senderEmail } = await request.json();

    // Validate required fields
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Clean and validate phone number format
    const cleanedPhone = phoneNumber.replace(/[^\d+]/g, '');
    if (!cleanedPhone.startsWith('+') || cleanedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Please provide a valid phone number with country code (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    logger.info('[WhatsApp Invite] Attempting to send invitation', {
      phoneNumber: cleanedPhone,
      senderName,
      messageLength: message.length
    });

    // Check if WhatsApp service is configured
    const whatsappApiKey = process.env.WHATSAPP_API_KEY;
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;

    if (!whatsappApiKey || !whatsappApiUrl) {
      logger.warn('[WhatsApp Invite] WhatsApp service not configured');
      return NextResponse.json(
        { error: 'WhatsApp service is temporarily unavailable. Please try email invitation instead.' },
        { status: 503 }
      );
    }

    // Send WhatsApp message
    const whatsappResponse = await fetch(`${whatsappApiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanedPhone,
        type: 'text',
        text: {
          body: message
        }
      }),
    });

    if (!whatsappResponse.ok) {
      const errorData = await whatsappResponse.json().catch(() => ({}));
      logger.error('[WhatsApp Invite] Failed to send WhatsApp message', {
        status: whatsappResponse.status,
        error: errorData
      });
      
      return NextResponse.json(
        { error: 'Failed to send WhatsApp invitation. Please check the phone number and try again.' },
        { status: 500 }
      );
    }

    const whatsappData = await whatsappResponse.json();
    
    logger.info('[WhatsApp Invite] Successfully sent WhatsApp invitation', {
      phoneNumber: cleanedPhone,
      messageId: whatsappData.messages?.[0]?.id
    });

    // Log the invitation for tracking (optional - you can store this in your database)
    try {
      // You can add database logging here if needed
      // await logInvitation({
      //   type: 'whatsapp',
      //   recipient: cleanedPhone,
      //   sender: senderEmail,
      //   messageId: whatsappData.messages?.[0]?.id
      // });
    } catch (logError) {
      logger.warn('[WhatsApp Invite] Failed to log invitation', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'WhatsApp invitation sent successfully',
      messageId: whatsappData.messages?.[0]?.id
    });

  } catch (error) {
    logger.error('[WhatsApp Invite] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}