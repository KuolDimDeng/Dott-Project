import { 
  makeBackendRequest, 
  parseResponse, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/utils/currencyProxyHelper';

export async function GET() {
  console.log('🌐 [Test Public Proxy] === GET REQUEST START ===');
  
  try {
    // Make request without cookies (public endpoint)
    const response = await makeBackendRequest('/api/currency/test-public/', {
      method: 'GET',
    });
    
    // Parse response
    const data = await parseResponse(response);
    
    if (!response.ok) {
      console.error('🌐 [Test Public Proxy] Backend returned error:', data);
      return createErrorResponse(
        new Error(data.error || 'Public test failed'),
        response.status
      );
    }
    
    console.log('🌐 [Test Public Proxy] === GET REQUEST SUCCESS ===');
    return createSuccessResponse(data);
    
  } catch (error) {
    console.error('🌐 [Test Public Proxy] === GET REQUEST ERROR ===');
    return createErrorResponse(error, error.status || 502);
  }
}