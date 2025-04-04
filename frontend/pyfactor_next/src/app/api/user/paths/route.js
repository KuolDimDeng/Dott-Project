import { NextResponse } from 'next/server';

// In-memory store for user navigation paths
const userPaths = {};

/**
 * GET handler for user navigation paths
 */
export async function GET(request) {
  try {
    // Extract the user identifier from cookies or query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Get user from cookie if no userId provided
    let user = userId;
    if (!user) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (name === 'authUser') {
            user = decodeURIComponent(value);
          }
        });
      }
    }
    
    // Fallback to an anonymous identifier if no user is found
    const userIdentifier = user || 'anonymous-user';
    
    // Retrieve the user's navigation paths or create a default entry
    const userPathHistory = userPaths[userIdentifier] || {
      recent: [],
      favorites: [],
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json({
      paths: userPathHistory,
      user: userIdentifier
    });
  } catch (error) {
    console.error('[API] User paths GET error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to fetch user paths',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * POST handler for updating user navigation history
 */
export async function POST(request) {
  try {
    // Get request body
    const data = await request.json();
    const { path, userId, action = 'visit' } = data;
    
    if (!path) {
      return NextResponse.json({ 
        error: 'Path is required'
      }, { status: 400 });
    }
    
    // Get user from cookie if no userId provided
    let user = userId;
    if (!user) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (name === 'authUser') {
            user = decodeURIComponent(value);
          }
        });
      }
    }
    
    // Fallback to an anonymous identifier if no user is found
    const userIdentifier = user || 'anonymous-user';
    
    // Get or create the user's path history
    if (!userPaths[userIdentifier]) {
      userPaths[userIdentifier] = {
        recent: [],
        favorites: [],
        lastUpdated: new Date().toISOString()
      };
    }
    
    const userPathHistory = userPaths[userIdentifier];
    
    // Process based on the action
    switch (action) {
      case 'visit':
        // Add to recent paths, avoiding duplicates by removing existing entry first
        userPathHistory.recent = userPathHistory.recent.filter(item => item.path !== path);
        userPathHistory.recent.unshift({
          path,
          title: data.title || path,
          timestamp: new Date().toISOString(),
          visitCount: (userPathHistory.recent.find(item => item.path === path)?.visitCount || 0) + 1
        });
        
        // Keep only the 10 most recent paths
        if (userPathHistory.recent.length > 10) {
          userPathHistory.recent = userPathHistory.recent.slice(0, 10);
        }
        break;
        
      case 'favorite':
        // Add to favorites if not already present
        if (!userPathHistory.favorites.some(item => item.path === path)) {
          userPathHistory.favorites.push({
            path,
            title: data.title || path,
            timestamp: new Date().toISOString()
          });
        }
        break;
        
      case 'unfavorite':
        // Remove from favorites
        userPathHistory.favorites = userPathHistory.favorites.filter(item => item.path !== path);
        break;
        
      default:
        return NextResponse.json({ 
          error: 'Invalid action'
        }, { status: 400 });
    }
    
    // Update the last updated timestamp
    userPathHistory.lastUpdated = new Date().toISOString();
    
    return NextResponse.json({
      success: true,
      paths: userPathHistory,
      user: userIdentifier
    });
  } catch (error) {
    console.error('[API] User paths POST error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to update user paths',
      message: error.message 
    }, { status: 500 });
  }
} 