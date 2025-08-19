import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session',
        total_collected: 0,
        by_jurisdiction: [],
        average_rate: 0,
        taxable_transactions: 0
      });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '30';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query string
    let queryString = `days=${days}`;
    if (startDate) queryString += `&start_date=${startDate}`;
    if (endDate) queryString += `&end_date=${endDate}`;

    // Fetch tax summary from backend
    const response = await fetch(`${API_BASE_URL}/api/taxes/summary?${queryString}`, {
      method: 'GET',
      headers: {
        'Cookie': `sid=${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('[Tax Summary API] Failed to fetch:', response.status);
      
      // Return mock data for development
      return NextResponse.json({
        success: true,
        total_collected: 0,
        by_jurisdiction: [],
        average_rate: 0,
        taxable_transactions: 0,
        period: {
          start: startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString()
        }
      });
    }

    const data = await response.json();
    
    // Process and enhance the data
    const enhancedData = {
      success: true,
      total_collected: data.total_collected || data.total_tax || 0,
      by_jurisdiction: data.by_jurisdiction || data.tax_by_state || [],
      average_rate: data.average_rate || data.avg_tax_rate || 0,
      taxable_transactions: data.taxable_transactions || data.total_transactions || 0,
      tax_liability: data.tax_liability || 0,
      tax_credits: data.tax_credits || 0,
      period: data.period || {
        start: startDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        end: endDate || new Date().toISOString()
      }
    };

    return NextResponse.json(enhancedData);

  } catch (error) {
    console.error('[Tax Summary API] Error:', error);
    
    // Return empty data structure on error
    return NextResponse.json({
      success: false,
      error: error.message,
      total_collected: 0,
      by_jurisdiction: [],
      average_rate: 0,
      taxable_transactions: 0
    });
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session' 
      }, { status: 401 });
    }

    const body = await request.json();
    
    // Create tax report
    const response = await fetch(`${API_BASE_URL}/api/taxes/report`, {
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
        { success: false, error: errorData.error || 'Failed to generate tax report' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      report: data
    });

  } catch (error) {
    console.error('[Tax Report API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate tax report' },
      { status: 500 }
    );
  }
}