import { cookies } from 'next/headers';
import { 
  makeBackendRequest, 
  parseResponse, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/utils/currencyProxyHelper';

export async function GET() {
  console.log('🔐 [Test Auth Proxy] === GET REQUEST START ===');
  
  try {
    const cookieStore = cookies();
    
    // Make authenticated request
    const response = await makeBackendRequest('/api/currency/test-auth/', {
      method: 'GET',
    }, cookieStore);
    
    // Parse response
    const data = await parseResponse(response);
    
    if (!response.ok) {
      console.error('🔐 [Test Auth Proxy] Backend returned error:', data);
      return createErrorResponse(
        new Error(data.error || 'Auth test failed'),
        response.status
      );
    }
    
    console.log('🔐 [Test Auth Proxy] === GET REQUEST SUCCESS ===');
    return createSuccessResponse(data);
    
  } catch (error) {
    console.error('🔐 [Test Auth Proxy] === GET REQUEST ERROR ===');
    return createErrorResponse(error, error.status || 502);
  }
}