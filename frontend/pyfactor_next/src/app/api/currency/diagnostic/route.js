import { cookies } from 'next/headers';
import { 
  makeBackendRequest, 
  parseResponse, 
  createErrorResponse, 
  createSuccessResponse 
} from '@/utils/currencyProxyHelper';

export async function GET() {
  console.log('🩺 [Currency Diagnostic] === GET REQUEST START ===');
  
  try {
    const cookieStore = await cookies();
    
    // Make authenticated request
    const response = await makeBackendRequest('/api/currency/diagnostic/', {
      method: 'GET',
    }, cookieStore);
    
    // Parse response
    const data = await parseResponse(response);
    
    if (!response.ok) {
      console.error('🩺 [Currency Diagnostic] Backend returned error:', data);
      return createErrorResponse(
        new Error(data.error || 'Diagnostic failed'),
        response.status
      );
    }
    
    console.log('🩺 [Currency Diagnostic] === GET REQUEST SUCCESS ===');
    console.log('🩺 [Currency Diagnostic] Diagnostic data:', JSON.stringify(data, null, 2));
    
    // Check for specific diagnostic issues
    if (data.diagnostics?.business_details?.has_currency_fields === false) {
      console.error('🩺 [Currency Diagnostic] WARNING: Currency fields are missing from BusinessDetails model!');
    }
    
    return createSuccessResponse(data);
    
  } catch (error) {
    console.error('🩺 [Currency Diagnostic] === GET REQUEST ERROR ===');
    return createErrorResponse(error, error.status || 502);
  }
}