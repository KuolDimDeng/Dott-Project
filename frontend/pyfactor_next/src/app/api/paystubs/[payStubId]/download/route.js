import { cookies } from 'next/headers';

/**
 * Download pay stub PDF
 */
export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    const { payStubId } = params;
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/paystubs/${payStubId}/download/`, {
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', response.status, errorData);
      return Response.json(
        { error: errorData || 'Failed to download pay stub' },
        { status: response.status }
      );
    }

    // Return the PDF blob
    const blob = await response.blob();
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="paystub-${payStubId}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('Proxy error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}