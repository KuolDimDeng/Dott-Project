import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    const body = await request.json();
    const cookieStore = cookies();
    
    logger.info('[Email Invite] 📧 === START EMAIL INVITATION ===', {
      email: body.email,
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      messageLength: body.message?.length,
      timestamp: new Date().toISOString()
    });

    // Forward to Django backend using the new invitations endpoint
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/invitations/email/`;
    
    logger.info('[Email Invite] 🚀 Sending request to backend', {
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
    logger.info('[Email Invite] 📥 Backend response received', {
      status: response.status,
      statusText: response.statusText,
      responseLength: responseText.length
    });

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[Email Invite] ❌ Failed to parse response', {
        error: parseError.message,
        responseText: responseText.substring(0, 500)
      });
      return NextResponse.json(
        { error: 'Invalid response from server' },
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      logger.error('[Email Invite] ❌ Backend error', {
        status: response.status,
        error: data,
        errorMessage: data.error
      });
      
      return NextResponse.json(
        { error: data.error || 'Failed to send email invitation.' },
        { status: response.status }
      );
    }
    
    logger.info('[Email Invite] ✅ Successfully sent email invitation', {
      success: data.success,
      message: data.message
    });

    return NextResponse.json(data);

  } catch (error) {
    logger.error('[Email Invite] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}