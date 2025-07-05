import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // Get session from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appSession');
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Parse session to get user data
    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    const user = sessionData.user;
    
    if (!user) {
      return NextResponse.json({ error: 'User not found in session' }, { status: 401 });
    }
    
    // Default menu privileges based on user role
    const userRole = user.role || user.userRole || 'user';
    
    // Define default privileges by role
    const defaultPrivileges = {
      owner: {
        dashboard: true,
        sales: true,
        purchases: true,
        inventory: true,
        hr: true,
        finance: true,
        reports: true,
        settings: true,
        users: true
      },
      admin: {
        dashboard: true,
        sales: true,
        purchases: true,
        inventory: true,
        hr: true,
        finance: true,
        reports: true,
        settings: true,
        users: false
      },
      user: {
        dashboard: true,
        sales: true,
        purchases: true,
        inventory: true,
        hr: false,
        finance: false,
        reports: true,
        settings: false,
        users: false
      }
    };
    
    const privileges = defaultPrivileges[userRole] || defaultPrivileges.user;
    
    return NextResponse.json({
      privileges,
      role: userRole,
      email: user.email
    });
    
  } catch (error) {
    console.error('[MenuPrivileges] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch menu privileges',
      message: error.message 
    }, { status: 500 });
  }
}
