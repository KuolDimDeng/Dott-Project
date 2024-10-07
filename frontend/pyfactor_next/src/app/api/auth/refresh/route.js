import { getToken } from "next-auth/jwt";
import { NextResponse } from 'next/server';
import { refreshAccessToken } from "../[...nextauth]/route";

export async function POST(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const refreshedToken = await refreshAccessToken(token);

    if (refreshedToken.error) {
      return NextResponse.json({ error: refreshedToken.error }, { status: 401 });
    }

    return NextResponse.json(refreshedToken);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}