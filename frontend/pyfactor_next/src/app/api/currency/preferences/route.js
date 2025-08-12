import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/utils/backend-url';
import { handleAuthError } from '@/utils/api/errorHandlers';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      // Return empty if no session
      console.log('[Currency API] No session cookie, returning empty');
      return NextResponse.json({
        success: false,
        error: 'No session',
        preferences: null
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/currency/preferences`, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      // Return empty instead of default
      console.warn('[Currency API] Failed to fetch preferences:', response.status);
      return NextResponse.json({
        success: false,
        error: `Backend returned ${response.status}`,
        preferences: null
      });
    }

    const data = await response.json();
    console.log('[Currency API] Backend response:', data);
    
    // Map backend response to frontend format
    if (data.success && data.preferences) {
      return NextResponse.json({
        success: true,
        preferences: data.preferences
      });
    } else if (data.currency_code) {
      // Fallback for old format
      return NextResponse.json({
        success: true,
        preferences: {
          currency_code: data.currency_code,
          currency_name: data.currency_name,
          currency_symbol: data.currency_symbol
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid response format',
        preferences: null
      });
    }

  } catch (error) {
    console.error('[Currency API] Error:', error);
    // Return empty on error
    return NextResponse.json({
      success: false,
      error: error.message,
      preferences: null
    });
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return handleAuthError();
    }

    const body = await request.json();
    
    const response = await fetch(`${API_BASE_URL}/api/currency/preferences`, {
      method: 'POST',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: errorData.error || 'Failed to update currency preferences' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('[Currency API] Update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update currency preferences' },
      { status: 500 }
    );
  }
}