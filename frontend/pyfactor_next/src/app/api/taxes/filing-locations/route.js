import { NextResponse } from 'next/server';
import { getSecureSession } from '@/utils/sessionUtils-v2';
import { standardSecurityHeaders } from '@/utils/responseHeaders';
import Anthropic from '@anthropic-ai/sdk';

export async function GET(request) {
  try {
    const session = await getSecureSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const stateProvince = searchParams.get('stateProvince');
    const city = searchParams.get('city');

    if (!country) {
      return NextResponse.json(
        { error: 'Country is required' },
        { status: 400, headers: standardSecurityHeaders }
      );
    }

    // First, check if we have cached data
    const backendUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/taxes/filing-locations/`);
    backendUrl.searchParams.append('country', country);
    if (stateProvince) backendUrl.searchParams.append('state_province', stateProvince);
    if (city) backendUrl.searchParams.append('city', city);

    const backendResponse = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'X-Session-Id': session.id,
        'X-Tenant-Id': session.user?.tenantId,
      },
    });

    // If we have cached data that's not stale, return it
    if (backendResponse.ok) {
      const data = await backendResponse.json();
      if (data && !data.is_stale) {
        // Increment lookup count
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/taxes/filing-locations/${data.id}/increment/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'X-Session-Id': session.id,
          },
        });
        
        return NextResponse.json(data, { 
          status: 200, 
          headers: standardSecurityHeaders 
        });
      }
    }

    // If no cache or stale, use Claude AI to search for filing information
    if (!process.env.CLAUDE_TAX_API_KEY) {
      return NextResponse.json(
        { error: 'Tax API key not configured' },
        { status: 500, headers: standardSecurityHeaders }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_TAX_API_KEY,
    });

    // Build location string
    let locationString = city ? `${city}, ` : '';
    locationString += stateProvince ? `${stateProvince}, ` : '';
    locationString += country;

    const prompt = `You are a tax filing assistant. Please search for official tax filing websites and physical office addresses for the following location:

Location: ${locationString}

Please provide information in the following JSON format:
{
  "federal": {
    "website": "official federal tax website URL",
    "name": "official agency name",
    "address": "physical mailing address if available",
    "phone": "contact phone number",
    "email": "contact email if available"
  },
  "state": {
    "website": "official state/provincial tax website URL",
    "name": "official agency name",
    "address": "physical mailing address if available",
    "phone": "contact phone number",
    "email": "contact email if available"
  },
  "local": {
    "website": "official local/municipal tax website URL if applicable",
    "name": "official agency name",
    "address": "physical mailing address if available",
    "phone": "contact phone number",
    "email": "contact email if available"
  },
  "filing_deadlines": {
    "sales_tax": "typical filing deadline",
    "income_tax": "typical filing deadline",
    "property_tax": "typical filing deadline if applicable"
  },
  "special_instructions": "any special instructions or notes about filing in this location",
  "tax_types": ["list", "of", "applicable", "tax", "types"]
}

If any information is not available or not applicable, use empty string "". Focus on official government websites only. For the United States, include IRS for federal. For states, include the official state department of revenue or taxation.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.1, // Low temperature for factual accuracy
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    // Parse the response
    let filingInfo;
    try {
      const responseText = message.content[0].text;
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        filingInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[filing-locations] Error parsing Claude response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse tax filing information' },
        { status: 500, headers: standardSecurityHeaders }
      );
    }

    // Save to cache
    const cacheData = {
      country,
      state_province: stateProvince || '',
      city: city || '',
      federal_website: filingInfo.federal?.website || '',
      federal_name: filingInfo.federal?.name || '',
      federal_address: filingInfo.federal?.address || '',
      federal_phone: filingInfo.federal?.phone || '',
      federal_email: filingInfo.federal?.email || '',
      state_website: filingInfo.state?.website || '',
      state_name: filingInfo.state?.name || '',
      state_address: filingInfo.state?.address || '',
      state_phone: filingInfo.state?.phone || '',
      state_email: filingInfo.state?.email || '',
      local_website: filingInfo.local?.website || '',
      local_name: filingInfo.local?.name || '',
      local_address: filingInfo.local?.address || '',
      local_phone: filingInfo.local?.phone || '',
      local_email: filingInfo.local?.email || '',
      filing_deadlines: filingInfo.filing_deadlines || {},
      special_instructions: filingInfo.special_instructions || '',
      tax_types: filingInfo.tax_types || [],
    };

    // Save to backend cache
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/taxes/filing-locations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
        'X-Session-Id': session.id,
      },
      body: JSON.stringify(cacheData),
    });

    return NextResponse.json(cacheData, { 
      status: 200, 
      headers: standardSecurityHeaders 
    });
  } catch (error) {
    console.error('[filing-locations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filing location information' },
      { status: 500, headers: standardSecurityHeaders }
    );
  }
}