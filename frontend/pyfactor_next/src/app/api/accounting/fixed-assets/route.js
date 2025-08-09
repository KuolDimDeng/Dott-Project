import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch from Django backend
    const response = await fetch(`${API_BASE_URL}/api/finance/fixed-assets/`, {
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error('[FixedAssets API] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch fixed assets' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform the data to match frontend expectations
    const assets = Array.isArray(data) ? data : (data.assets || data.results || []);
    
    const transformedAssets = assets.map(asset => ({
      id: asset.id,
      name: asset.name || asset.asset_name,
      assetTag: asset.asset_tag || asset.tag,
      category: asset.category || asset.asset_type,
      description: asset.description || '',
      acquisitionDate: asset.acquisition_date || asset.purchase_date,
      acquisitionCost: parseFloat(asset.acquisition_cost || asset.cost || 0),
      depreciationMethod: asset.depreciation_method || 'straight-line',
      usefulLife: asset.useful_life || 5,
      salvageValue: parseFloat(asset.salvage_value || 0),
      currentValue: parseFloat(asset.current_value || asset.book_value || 0),
      accumulatedDepreciation: parseFloat(asset.accumulated_depreciation || 0),
      location: asset.location || '',
      status: asset.status || 'active',
      vendor: asset.vendor || '',
      warrantyExpiry: asset.warranty_expiry || null,
      maintenanceSchedule: asset.maintenance_schedule || 'quarterly',
      notes: asset.notes || ''
    }));
    
    return NextResponse.json({ assets: transformedAssets });
  } catch (error) {
    console.error('[FixedAssets API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fixed assets' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Transform to backend format
    const backendData = {
      name: body.name,
      asset_tag: body.assetTag,
      category: body.category,
      description: body.description,
      acquisition_date: body.acquisitionDate,
      acquisition_cost: body.acquisitionCost,
      depreciation_method: body.depreciationMethod,
      useful_life: body.usefulLife,
      salvage_value: body.salvageValue || 0,
      location: body.location,
      status: body.status || 'active',
      vendor: body.vendor,
      warranty_expiry: body.warrantyExpiry || null,
      maintenance_schedule: body.maintenanceSchedule,
      notes: body.notes || ''
    };
    
    const response = await fetch(`${API_BASE_URL}/api/finance/fixed-assets/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
        'Cookie': `sid=${sessionId.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(backendData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('[FixedAssets API] Create error:', error);
      return NextResponse.json(
        { error: 'Failed to create asset' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[FixedAssets API] Create error:', error);
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}