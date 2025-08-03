import { NextResponse } from 'next/server';
import { makeRequest } from '@/utils/api';

export async function GET(request) {
  try {
    console.log('🎯 [Payroll Tax Settings API] === START GET ===');
    
    // Get current tenant's payroll tax settings
    const response = await makeRequest('taxes/tenant-settings/payroll/current/', {
      method: 'GET',
    });
    
    console.log('🎯 [Payroll Tax Settings API] Backend response:', {
      source: response.source,
      hasSettings: !!response.settings,
      settings: response.settings
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Payroll Tax Settings API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payroll tax settings' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('🎯 [Payroll Tax Settings API] === START POST ===');
    
    const data = await request.json();
    console.log('🎯 [Payroll Tax Settings API] Saving data:', {
      country: data.country,
      region: data.region_code,
      employeeSS: data.employee_social_security_rate,
      employerSS: data.employer_social_security_rate
    });
    
    // Save custom payroll tax settings
    const response = await makeRequest('taxes/tenant-settings/payroll/save_custom/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    console.log('🎯 [Payroll Tax Settings API] Save response:', {
      success: !!response.settings,
      message: response.message
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Payroll Tax Settings API] Save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save payroll tax settings' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    console.log('🎯 [Payroll Tax Settings API] === START DELETE ===');
    
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const region_code = searchParams.get('region_code') || '';
    
    console.log('🎯 [Payroll Tax Settings API] Resetting:', { country, region_code });
    
    // Reset to global defaults
    const response = await makeRequest('taxes/tenant-settings/payroll/reset_to_global/', {
      method: 'DELETE',
      body: JSON.stringify({ country, region_code }),
    });
    
    console.log('🎯 [Payroll Tax Settings API] Reset response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('🎯 [Payroll Tax Settings API] Reset error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset payroll tax settings' },
      { status: error.status || 500 }
    );
  }
}