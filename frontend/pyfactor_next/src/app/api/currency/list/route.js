import { cookies } from 'next/headers';
import { 
  makeBackendRequest, 
  parseResponse, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/utils/currencyProxyHelper';

export async function GET() {
  console.log('📋 [Currency List] === GET REQUEST START ===');
  
  try {
    const cookieStore = cookies();
    
    // Make request - currency list might be public or authenticated
    const response = await makeBackendRequest('/api/currency/list/', {
      method: 'GET',
    }, cookieStore);
    
    // Parse response
    const data = await parseResponse(response);
    
    if (!response.ok) {
      console.error('📋 [Currency List] Backend returned error:', data);
      return createErrorResponse(
        new Error(data.error || 'Failed to fetch currency list'),
        response.status
      );
    }
    
    console.log('📋 [Currency List] === GET REQUEST SUCCESS ===');
    return createSuccessResponse(data);
    
  } catch (error) {
    console.error('📋 [Currency List] === GET REQUEST ERROR ===');
    return createErrorResponse(error, error.status || 502);
  }
}