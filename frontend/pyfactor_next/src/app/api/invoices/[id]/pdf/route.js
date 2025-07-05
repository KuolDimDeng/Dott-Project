import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

// Helper function to get session cookie
async function getSessionCookie() {
  const cookieStore = await cookies();
  const sidCookie = cookieStore.get('sid');
  return sidCookie;
}

/**
 * Generate a PDF of an invoice
 * This is a placeholder implementation. In production, you should:
 * 1. Fetch invoice data from the backend
 * 2. Use a proper PDF generation service or library
 * 3. Return the generated PDF
 */
export async function GET(request, { params }) {
  const { id } = params;
  
  try {
    logger.info('[Invoice PDF API] Generating PDF for invoice:', id);
    
    // Get session cookie
    const sidCookie = await getSessionCookie();
    if (!sidCookie) {
      logger.error('[Invoice PDF API] No session cookie found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/sales/invoices/${id}/pdf/`;
    logger.info('[Invoice PDF API] Forwarding to backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Session ${sidCookie.value}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Invoice PDF API] Backend error:', errorText);
      
      // If backend doesn't have PDF endpoint yet, return a placeholder message
      if (response.status === 404) {
        return NextResponse.json({
          error: 'PDF generation not yet implemented',
          message: 'The PDF generation feature is coming soon. Please use the invoice preview for now.'
        }, { status: 501 });
      }
      
      return NextResponse.json({
        error: 'Failed to generate PDF',
        details: errorText
      }, { status: response.status });
    }
    
    // Get the PDF content
    const pdfBuffer = await response.arrayBuffer();
    
    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      },
    });
    
  } catch (error) {
    logger.error('[Invoice PDF API] Error:', error);
    return NextResponse.json({
      error: 'Failed to generate PDF',
      message: error.message
    }, { status: 500 });
  }
}