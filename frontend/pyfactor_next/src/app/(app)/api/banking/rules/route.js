import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const cookies = request.cookies;
    const sessionId = cookies.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const response = await fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/banking/rules/`, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
      }
    });
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Banking Rules] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookies = request.cookies;
    const sessionId = cookies.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    const response = await fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/banking/rules/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Banking Rules] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}