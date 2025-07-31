import { cookies } from 'next/headers';
import { 
  makeBackendRequest, 
  parseResponse, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/utils/currencyProxyHelper';

export async function POST(request) {
  console.log('💱 [Exchange Rate] === POST REQUEST START ===');
  
  try {
    const cookieStore = cookies();
    const body = await request.json();
    
    console.log('💱 [Exchange Rate] Request body:', JSON.stringify(body, null, 2));
    
    // Make authenticated request
    const response = await makeBackendRequest('/api/currency/exchange-rate/', {
      method: 'POST',
      body: JSON.stringify(body),
    }, cookieStore);
    
    // Parse response
    const data = await parseResponse(response);
    
    if (!response.ok) {
      console.error('💱 [Exchange Rate] Backend returned error:', data);
      return createErrorResponse(
        new Error(data.error || 'Failed to fetch exchange rate'),
        response.status
      );
    }
    
    console.log('💱 [Exchange Rate] === POST REQUEST SUCCESS ===');
    return createSuccessResponse(data);
    
  } catch (error) {
    console.error('💱 [Exchange Rate] === POST REQUEST ERROR ===');
    return createErrorResponse(error, error.status || 502);
  }
}