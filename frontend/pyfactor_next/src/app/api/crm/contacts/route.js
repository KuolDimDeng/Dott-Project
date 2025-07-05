import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { logger } from '@/utils/logger';
import { appCache } from '@/utils/appCache';

/**
 * API route to handle CRM contacts
 */
export async function GET(request) {
  try {
    // Get auth token from request headers
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get search params
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || 1;
    const limit = searchParams.get('limit') || 10;
    const search = searchParams.get('search') || '';
    
    // Build cache key from query params
    const cacheKey = `crm_contacts_${page}_${limit}_${search}`;
    
    // Try to get data from AppCache first
    try {
      const cachedData = await appCache.get(cacheKey);
      if (cachedData) {
        logger.info('Using cached contacts data');
        return NextResponse.json(JSON.parse(cachedData));
      }
    } catch (cacheError) {
      logger.warn('Error getting data from AppCache:', cacheError);
    }
    
    // Build query params
    let queryParams = new URLSearchParams();
    queryParams.append('page', page);
    queryParams.append('limit', limit);
    if (search) {
      queryParams.append('search', search);
    }
    
    try {
      // Fetch contacts from backend API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/crm/contacts/?${queryParams.toString()}`,
        {
          headers: { Authorization: authHeader },
          // Set a shorter timeout to prevent long waits if backend is down
          signal: AbortSignal.timeout(5000)
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Store in AppCache for future quick access
        try {
          await appCache.set(cacheKey, JSON.stringify(data), { expires: 60 * 5 }); // 5 minutes cache
        } catch (cacheError) {
          logger.warn('Error caching contacts data:', cacheError);
        }
        
        return NextResponse.json(data);
      }
      
      // If backend fetch failed, try to use mock data
      logger.warn('Backend API request failed, using mock data for CRM contacts');
    } catch (fetchError) {
      // Log the fetch error but continue
      logger.error('Error fetching from backend CRM contacts API:', fetchError);
    }
    
    // Return mock data as fallback
    const mockData = {
      results: [
        {
          id: 1,
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '(555) 123-4567',
          company: 'Acme Corp',
          position: 'CEO',
          status: 'active',
          lastContacted: '2023-10-15',
          leadSource: 'Website'
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '(555) 987-6543',
          company: 'XYZ Industries',
          position: 'Marketing Director',
          status: 'active',
          lastContacted: '2023-10-10',
          leadSource: 'Referral'
        },
        {
          id: 3,
          name: 'Robert Johnson',
          email: 'robert.johnson@example.com',
          phone: '(555) 456-7890',
          company: 'Johnson & Partners',
          position: 'Partner',
          status: 'inactive',
          lastContacted: '2023-09-05',
          leadSource: 'Cold Call'
        }
      ],
      total: 3,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: 1
    };
    
    return NextResponse.json(mockData);
    
  } catch (error) {
    logger.error('Error in CRM contacts API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Get auth token from request headers
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    try {
      // Create contact in backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/crm/contacts/`, {
        method: 'POST',
        headers: { 
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Invalidate contacts cache
        try {
          const cacheKeys = await appCache.keys('crm_contacts_');
          for (const key of cacheKeys) {
            await appCache.remove(key);
          }
        } catch (cacheError) {
          logger.warn('Error invalidating contacts cache:', cacheError);
        }
        
        return NextResponse.json(data);
      }
      
      // If failed, return error from the backend
      try {
        const errorData = await response.json();
        return NextResponse.json(errorData, { status: response.status });
      } catch (e) {
        return NextResponse.json({ 
          error: 'Backend API Error',
          message: await response.text()
        }, { status: response.status });
      }
    } catch (fetchError) {
      logger.error('Error creating contact in backend:', fetchError);
      throw new Error('Failed to create contact');
    }
    
  } catch (error) {
    logger.error('Error in CRM contacts POST API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}