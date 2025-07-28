import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionid")?.value;
    const sidCookie = cookieStore.get("sid")?.value;
    
    // Get all cookies for debugging
    const allCookies = {};
    const cookieArray = cookieStore.getAll();
    for (const cookie of cookieArray) {
      allCookies[cookie.name] = cookie.value;
    }

    console.log("[Logo Upload] All cookies:", allCookies);
    console.log("[Logo Upload] Session cookies:", { sessionId, sidCookie });

    // Check for either sessionid or sid cookie
    const authCookie = sessionId || sidCookie;
    if (!authCookie) {
      console.error("[Logo Upload] No authentication cookie found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Get CSRF token
    const csrfToken = cookieStore.get('csrftoken')?.value;
    
    // Build cookie header with all relevant cookies
    let cookieHeader = sessionId 
      ? `sessionid=${sessionId}` 
      : `sid=${sidCookie}`;
    
    if (csrfToken) {
      cookieHeader += `; csrftoken=${csrfToken}`;
    }

    console.log("[Logo Upload] Using cookie header:", cookieHeader);
    console.log("[Logo Upload] CSRF token:", csrfToken);

    const headers = {
      Cookie: cookieHeader,
    };
    
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    const response = await fetch(`${API_BASE_URL}/users/api/business/logo/upload/`, {
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