import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sid')?.value;
    const body = await request.json();

    const response = await fetch(`${process.env.BACKEND_URL}/api/currency/exchange-rate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionId ? `sid=${sessionId}` : '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch exchange rate' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}