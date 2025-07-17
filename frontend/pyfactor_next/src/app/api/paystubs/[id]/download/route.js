import { cookies } from 'next/headers';

/**
 * Download a specific pay stub PDF
 */
export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    const payStubId = params.id;
    
    // Forward request to Django backend
    const backendUrl = process.env.BACKEND_URL || 'https://dott-api-v1.onrender.com';
    const response = await fetch(`${backendUrl}/api/payroll/paystubs/${payStubId}/download/`, {
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'User-Agent': 'Dott-Frontend/1.0'
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

    // Get the content type from the backend response
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentDisposition = response.headers.get('content-disposition') || `attachment; filename="paystub-${payStubId}.pdf"`;
    
    // Stream the PDF response
    const blob = await response.blob();
    
    return new Response(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition
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