import { cookies } from 'next/headers';

/**
 * Download specific payroll report
 */
export async function POST(request, { params }) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie) {
      return Response.json({ error: 'No session found' }, { status: 401 });
    }

    const { reportType } = params;
    const data = await request.json();
    
    // Forward request to Django backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
    const response = await fetch(`${backendUrl}/api/payroll/download-report/${reportType}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Session ${sidCookie.value}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Backend error:', response.status, errorData);
      return Response.json(
        { error: errorData || 'Failed to download report' },
        { status: response.status }
      );
    }

    // Return the PDF blob
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
    
    return new Response(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`
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