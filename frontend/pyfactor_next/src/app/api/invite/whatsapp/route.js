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
    
    logger.info('[WhatsApp Invite] 📱 === START WHATSAPP INVITATION ===', {
      phoneNumber: body.phoneNumber,
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      messageLength: body.message?.length,
      timestamp: new Date().toISOString()
    });

    // Log environment configuration
    logger.info('[WhatsApp Invite] 🔧 Environment check', {
      API_URL: process.env.NEXT_PUBLIC_API_URL,
      hasApiUrl: !!process.env.NEXT_PUBLIC_API_URL
    });

    // Forward to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/invitations/whatsapp/`;
    
    logger.info('[WhatsApp Invite] 🚀 Sending request to backend', {
      url: backendUrl,
      method: 'POST',
      hasCookies: !!cookieStore.toString()
    });

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieStore.toString(),
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    logger.info('[WhatsApp Invite] 📥 Backend response received', {
      status: response.status,
      statusText: response.statusText,
      responseLength: responseText.length,
      headers: Object.fromEntries(response.headers.entries())
    });

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[WhatsApp Invite] ❌ Failed to parse response', {
        error: parseError.message,
        responseText: responseText.substring(0, 500)
      });
      return NextResponse.json(
        { error: 'Invalid response from server' },
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      logger.error('[WhatsApp Invite] ❌ Backend error', {
        status: response.status,
        error: data,
        errorMessage: data.error,
        fullResponse: JSON.stringify(data)
      });
      
      return NextResponse.json(
        { error: data.error || 'Failed to send WhatsApp invitation.' },
        { status: response.status }
      );
    }
    
    logger.info('[WhatsApp Invite] ✅ Successfully sent WhatsApp invitation', {
      success: data.success,
      messageId: data.messageId,
      fullResponse: JSON.stringify(data)
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