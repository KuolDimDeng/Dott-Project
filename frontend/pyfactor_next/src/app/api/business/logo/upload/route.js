import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionid")?.value;
    const sidCookie = cookieStore.get("sid")?.value;

    console.log("[Logo Upload] Session cookies:", { sessionId, sidCookie });

    // Check for either sessionid or sid cookie
    const authCookie = sessionId || sidCookie;
    if (!authCookie) {
      console.error("[Logo Upload] No authentication cookie found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Build cookie header with all relevant cookies
    const cookieHeader = sessionId 
      ? `sessionid=${sessionId}` 
      : `sid=${sidCookie}`;

    console.log("[Logo Upload] Using cookie header:", cookieHeader);

    const response = await fetch(`${API_BASE_URL}/users/api/business/logo/upload/`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
      },
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