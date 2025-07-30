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
  const startTime = Date.now();
  
  try {
    const cookieStore = await cookies();
    const body = await request.json();
    
    console.log('🚀 [Currency Preferences] Request body:', JSON.stringify(body, null, 2));
    console.log('🚀 [Currency Preferences] Cookie store:', cookieStore.getAll().map(c => ({ name: c.name, value: c.value ? `${c.value.substring(0, 8)}...` : 'null' })));
    
    // Create an AbortController with a longer timeout for PUT operations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    try {
      // Make authenticated request
      const response = await makeBackendRequest('/api/currency/preferences/', {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: {
          'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
          'User-Agent': request.headers.get('user-agent') || '',
        },
        signal: controller.signal
      }, cookieStore);
      
      clearTimeout(timeoutId);
      
      const elapsed = Date.now() - startTime;
      console.log(`🚀 [Currency Preferences] Request completed in ${elapsed}ms`);
      console.log('🚀 [Currency Preferences] Raw response status:', response.status);
      console.log('🚀 [Currency Preferences] Raw response headers:', Object.fromEntries(response.headers.entries()));
      
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
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('🚀 [Currency Preferences] Request timed out after 25 seconds');
        return createErrorResponse(new Error('Request timed out - please try again'), 504);
      }
      throw fetchError;
    }
    
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`🚀 [Currency Preferences] === PUT REQUEST ERROR after ${elapsed}ms ===`, error);
    return createErrorResponse(error, error.status || 502);
  }
}