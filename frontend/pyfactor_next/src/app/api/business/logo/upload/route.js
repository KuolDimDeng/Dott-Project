import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionid")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the form data from the request
    const formData = await request.formData();

    const response = await fetch(`${API_BASE_URL}/users/api/business/logo/upload/`, {
      method: "POST",
      headers: {
        Cookie: `sessionid=${sessionId}`,
      },
      body: formData, // Pass the FormData directly
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Upload failed" },
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