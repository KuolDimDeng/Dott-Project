import { cookies } from 'next/headers';
import { 
  makeBackendRequest, 
  parseResponse, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/utils/currencyProxyHelper';

export async function GET() {
  console.log('📡 [Currency Preferences] === GET REQUEST START ===');
  
  try {
    const cookieStore = await cookies();
    
    // Make authenticated request
    const response = await makeBackendRequest('/api/currency/preferences/', {
      method: 'GET',
    }, cookieStore);
    
    // Parse response
    const data = await parseResponse(response);
    
    if (!response.ok) {
      console.error('📡 [Currency Preferences] Backend returned error:', data);
      return createErrorResponse(
        new Error(data.error || 'Failed to fetch currency preferences'),
        response.status
      );
    }
    
    console.log('📡 [Currency Preferences] === GET REQUEST SUCCESS ===');
    return createSuccessResponse(data);
    
  } catch (error) {
    console.error('📡 [Currency Preferences] === GET REQUEST ERROR ===');
    return createErrorResponse(error, error.status || 502);
  }
}

export async function PUT(request) {
  console.log('🚀 [Currency Preferences] === PUT REQUEST START ===');
  
  try {
    const cookieStore = await cookies();
    const body = await request.json();
    
    console.log('🚀 [Currency Preferences] Request body:', JSON.stringify(body, null, 2));
    
    // Make authenticated request
    const response = await makeBackendRequest('/api/currency/preferences/', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
        'User-Agent': request.headers.get('user-agent') || '',
      }
    }, cookieStore);
    
    // Parse response
    const data = await parseResponse(response);
    
    if (!response.ok) {
      console.error('🚀 [Currency Preferences] Backend returned error:', data);
      return createErrorResponse(
        new Error(data.error || data.detail || 'Failed to update currency preferences'),
        response.status
      );
    }
    
    console.log('🚀 [Currency Preferences] === PUT REQUEST SUCCESS ===');
    return createSuccessResponse(data);
    
  } catch (error) {
    console.error('🚀 [Currency Preferences] === PUT REQUEST ERROR ===');
    return createErrorResponse(error, error.status || 502);
  }
}