import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

// WhatsApp Business API integration for business owner invitations

/**
 * Send WhatsApp invitation to a business owner
 * POST /api/invite/whatsapp
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const cookieStore = cookies();
    
    logger.info('[WhatsApp Invite] Forwarding request to backend', {
      phoneNumber: body.phoneNumber,
      senderName: body.senderName
    });

    // Forward to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/invitations/whatsapp/`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieStore.toString(),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      logger.error('[WhatsApp Invite] Backend error', {
        status: response.status,
        error: data
      });
      
      return NextResponse.json(
        { error: data.error || 'Failed to send WhatsApp invitation.' },
        { status: response.status }
      );
    }
    
    logger.info('[WhatsApp Invite] Successfully sent WhatsApp invitation', {
      messageId: data.messageId
    });

    return NextResponse.json(data);

  } catch (error) {
    logger.error('[WhatsApp Invite] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}