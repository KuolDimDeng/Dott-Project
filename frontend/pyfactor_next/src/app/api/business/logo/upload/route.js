import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://api.dottapps.com';

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const sidCookie = cookieStore.get("sid");
    
    // Get all cookies for debugging
    const allCookies = {};
    const cookieArray = cookieStore.getAll();
    for (const cookie of cookieArray) {
      allCookies[cookie.name] = cookie.value;
    }

    console.log("[Logo Upload] All cookies:", allCookies);
    console.log("[Logo Upload] Session cookie:", sidCookie ? { value: sidCookie.value.substring(0, 8) + '...', name: sidCookie.name } : 'NOT FOUND');

    // Check for session cookie (following HR API pattern)
    if (!sidCookie) {
      console.error("[Logo Upload] No session cookie found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the form data from the request
    const formData = await request.formData();

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

    console.log("[Logo Upload] Using headers:", { 
      ...headers, 
      Cookie: 'session_token=***', 
      Authorization: 'Session ***',
      'X-Tenant-ID': tenantId || 'NOT SET'
    });
    console.log("[Logo Upload] CSRF token:", csrfToken);
    console.log("[Logo Upload] Tenant ID:", tenantId);

    const response = await fetch(`${BACKEND_URL}/api/users/api/business/logo/upload/`, {
      method: "POST",
      headers,
      body: formData, // Pass the FormData directly
    });

    console.log("[Logo Upload] Response status:", response.status);

    if (!response.ok) {
      let errorMessage = "Upload failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.detail || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = `Upload failed (${response.status} ${response.statusText})`;
      }
      console.error("[Logo Upload] Error:", errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error uploading business logo:", error);
    return NextResponse.json(
      { error: "Failed to upload business logo" },
      { status: 500 }
    );
  }
}