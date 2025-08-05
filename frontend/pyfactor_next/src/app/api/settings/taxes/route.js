import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('🎯 [Tax Settings API] === START GET ===');
    console.log('🎯 [Tax Settings API] Request URL:', request.url);
    console.log('🎯 [Tax Settings API] Request method:', request.method);
    
    // Pass the original request to makeRequest for proper auth handling
    console.log('🎯 [Tax Settings API] Making request to: taxes/tenant-settings/current/');
    const response = await makeRequest('taxes/tenant-settings/current/', {
      method: 'GET',
    }, request);
    
    console.log('🎯 [Tax Settings API] Backend response:', {
      source: response.source,
      hasSettings: !!response.settings,
      settings: response.settings,
      error: response.error
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Tax Settings API] Error:', error);
    console.error('🎯 [Tax Settings API] Error details:', {
      message: error.message,
      status: error.status,
      response: error.response,
      stack: error.stack
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tax settings' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('🎯 [Tax Settings API] === START POST ===');
    
    const data = await request.json();
    console.log('🎯 [Tax Settings API] Saving data:', {
      country: data.country,
      region: data.region_code,
      rate: data.sales_tax_rate,
      type: data.sales_tax_type
    });
    
    // Save custom tax settings
    const response = await makeRequest('taxes/tenant-settings/save_custom/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    console.log('🎯 [Tax Settings API] Save response:', {
      success: !!response.settings,
      message: response.message
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Tax Settings API] Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save tax settings' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    console.log('🎯 [Tax Settings API] === START DELETE ===');
    
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const region_code = searchParams.get('region_code') || '';
    
    console.log('🎯 [Tax Settings API] Resetting:', { country, region_code });
    
    // Reset to global defaults
    const response = await makeRequest('taxes/tenant-settings/reset_to_global/', {
      method: 'DELETE',
      body: JSON.stringify({ country, region_code }),
    });
    
    console.log('🎯 [Tax Settings API] Reset response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Tax Settings API] Reset error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset tax settings' },
      { status: error.status || 500 }
    );
  }
}