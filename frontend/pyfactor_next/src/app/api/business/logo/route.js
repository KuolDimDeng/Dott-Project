import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionid")?.value;
    const sidCookie = cookieStore.get("sid")?.value;

    // Check for either sessionid or sid cookie
    const authCookie = sessionId || sidCookie;
    if (!authCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Build cookie header
    const cookieHeader = sessionId 
      ? `sessionid=${sessionId}` 
      : `sid=${sidCookie}`;

    const response = await fetch(`${API_BASE_URL}/users/api/business/logo/`, {
      method: "GET",
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching business logo:", error);
    return NextResponse.json(
      { error: "Failed to fetch business logo" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionid")?.value;
    const sidCookie = cookieStore.get("sid")?.value;

    // Check for either sessionid or sid cookie
    const authCookie = sessionId || sidCookie;
    if (!authCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Build cookie header
    const cookieHeader = sessionId 
      ? `sessionid=${sessionId}` 
      : `sid=${sidCookie}`;

    const response = await fetch(`${API_BASE_URL}/users/api/business/logo/delete/`, {
      method: "DELETE",
      headers: {
        Cookie: cookieHeader,
      },
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