import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://api.dottapps.com';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get("sid");

    // Check for session cookie (following HR API pattern)
    if (!sidCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get CSRF token
    const csrfToken = cookieStore.get('csrftoken')?.value;
    
    // Get tenant ID from headers (following HR API pattern)
    const tenantId = request.headers.get('X-Tenant-ID');
    
    // Build headers following working business-info API pattern
    const headers = {
      'Authorization': `Session ${sidCookie.value}`,
      'Cookie': `session_token=${sidCookie.value}`,
      'Accept': 'application/json',
    };
    
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    const response = await fetch(`${BACKEND_URL}/api/users/api/business/logo/`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      // Handle 404 gracefully - user likely doesn't have a logo
      if (response.status === 404) {
        return NextResponse.json({ 
          logo_data: null,
          message: 'No logo found' 
        });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.log("[Business Logo API] Fetch failed (expected for users without logos):", error.message);
    // Return consistent response even on error - no logo found
    return NextResponse.json({ 
      logo_data: null,
      message: 'No logo found' 
    });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get("sid");

    // Check for session cookie (following HR API pattern)
    if (!sidCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get CSRF token
    const csrfToken = cookieStore.get('csrftoken')?.value;
    
    // Get tenant ID from headers (following HR API pattern)
    const tenantId = request.headers.get('X-Tenant-ID');
    
    // Build headers following working business-info API pattern
    const headers = {
      'Authorization': `Session ${sidCookie.value}`,
      'Cookie': `session_token=${sidCookie.value}`,
      'Accept': 'application/json',
    };
    
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    const response = await fetch(`${BACKEND_URL}/api/users/api/business/logo/delete/`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting business logo:", error);
    return NextResponse.json(
      { error: "Failed to delete business logo" },
      { status: 500 }
    );
  }
}