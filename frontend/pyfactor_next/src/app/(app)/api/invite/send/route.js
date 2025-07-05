import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // Check authentication by looking for session cookies
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { email, message, senderName, senderEmail } = await request.json();

    // Validate input
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Prepare email data for backend
    const emailData = {
      to_email: email.trim(),
      subject: `${senderName || 'A business colleague'} invited you to Dott: All-in-One Business Management Platform`,
      message: message.trim(),
      sender_name: senderName || senderEmail || 'Dott User',
      sender_email: senderEmail || 'noreply@dottapps.com',
      invite_url: 'https://dottapps.com/auth/signup'
    };

    // Send invitation via backend API
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const backendResponse = await fetch(`${API_URL}/api/auth/invites/send-friend/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
        'Cookie': `sid=${sidCookie.value}; session_token=${sidCookie.value}`,
      },
      body: JSON.stringify(emailData)
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('Backend invitation error:', errorData);
      
      return NextResponse.json(
        { error: errorData.detail || 'Failed to send invitation' },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();

    // Log the invitation for analytics
    console.log(`[Invitation] ${senderEmail} invited ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      invitationId: result.invitation_id || Date.now().toString()
    });

  } catch (error) {
    console.error('Invitation API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}