///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/refresh/route.js
import { getToken } from "next-auth/jwt";
import { NextResponse } from 'next/server';
import { refreshAccessToken } from "../[...nextauth]/route";

export async function POST(req) {
  try {
    console.log("Refresh token request received.");
    console.log("Request body:", req.body);
    console.log("Secret:", process.env.NEXTAUTH_SECRET);
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
    console.log("Refresh token:", req.body.refresh);

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    console.log("Token received for refresh:", token);

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const refreshedToken = await refreshAccessToken(token);
    console.log("Refreshed token response:", refreshedToken);

    if (refreshedToken.error) {
      return NextResponse.json({ error: refreshedToken.error }, { status: 401 });
    }

    return NextResponse.json(refreshedToken);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
