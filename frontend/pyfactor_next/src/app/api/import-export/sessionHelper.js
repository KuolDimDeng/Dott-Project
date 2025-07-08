import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';

export async function getSession() {
  try {
    // Get session from cookies
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value || cookieStore.get('sid')?.value;
    
    if (!sessionToken) {
      logger.warn('No session token found in import-export');
      return null;
    }

    // Fetch session from backend
    const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com'}/api/auth/session-v2/`, {
      headers: {
        'Cookie': `session_token=${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!sessionResponse.ok) {
      logger.warn('Invalid session response in import-export');
      return null;
    }

    const sessionData = await sessionResponse.json();
    return { user: sessionData.user };
  } catch (error) {
    logger.error('Error getting session in import-export', error);
    return null;
  }
}