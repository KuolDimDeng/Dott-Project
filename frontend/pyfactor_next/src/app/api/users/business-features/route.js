import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('sid')?.value || cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { features: ['jobs', 'pos'] }, // Default to all features if no session
        { status: 200 }
      );
    }

    const response = await fetch(`${API_URL}/api/users/business-features/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Business Features API] Error:', response.status);
      return NextResponse.json(
        { features: ['jobs', 'pos'] }, // Default to all features on error
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Business Features API] Error:', error);
    return NextResponse.json(
      { features: ['jobs', 'pos'] }, // Default to all features on error
      { status: 200 }
    );
  }
}