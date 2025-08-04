import { NextResponse } from 'next/server';
import { handleAuthError } from '@/utils/api/errorHandlers';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      // Return default currency preferences instead of error
      return NextResponse.json({
        success: true,
        data: {
          currency: 'USD',
          exchange_rate: 1,
          lastUpdated: new Date().toISOString()
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/currency/preferences/`, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      // Return default currency instead of throwing error
      console.warn('[Currency API] Failed to fetch preferences:', response.status);
      return NextResponse.json({
        success: true,
        data: {
          currency: 'USD',
          exchange_rate: 1,
          lastUpdated: new Date().toISOString()
        }
      });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data: {
        currency: data.currency || 'USD',
        exchange_rate: data.exchange_rate || 1,
        ...data
      }
    });

  } catch (error) {
    console.error('[Currency API] Error:', error);
    // Always return a valid response
    return NextResponse.json({
      success: true,
      data: {
        currency: 'USD',
        exchange_rate: 1,
        lastUpdated: new Date().toISOString()
      }
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
    
    const response = await fetch(`${API_BASE_URL}/api/currency/preferences/`, {
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