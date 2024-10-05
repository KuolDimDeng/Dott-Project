import { getToken } from "next-auth/jwt";
import { refreshAccessToken } from "../[...nextauth]/options";

export async function POST(req) {
  console.log('Refreshing token...');
  
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    console.log('Current token:', JSON.stringify(token, null, 2));

    if (!token) {
      console.log('No token found');
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const refreshedToken = await refreshAccessToken(token);
    console.log('Refreshed token:', JSON.stringify(refreshedToken, null, 2));

    if (refreshedToken.error) {
      console.log('Error refreshing token:', refreshedToken.error);
      return new Response(JSON.stringify({ error: refreshedToken.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(refreshedToken), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}