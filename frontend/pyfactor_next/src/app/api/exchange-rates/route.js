export const revalidate = 3600; // Revalidate every hour

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const baseCurrency = searchParams.get('base') || 'USD';
  
  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/41fc0bfadd338697395e482f/latest/${baseCurrency}`
    );
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return Response.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}