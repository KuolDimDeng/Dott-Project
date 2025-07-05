import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const cookies = request.cookies;
    const sessionId = cookies.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Forward the entire form data to Django backend
    const formData = await request.formData();
    
    const response = await fetch(`${process.env.BACKEND_API_URL || 'https://api.dottapps.com'}/api/banking/import-csv/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Import failed' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Banking Import] Error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}