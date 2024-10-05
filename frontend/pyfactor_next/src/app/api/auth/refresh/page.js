import { getToken } from "next-auth/jwt";  // Use NextAuth to manage tokens
import { refreshAccessToken } from "../[...nextauth]/options";  // The function that handles token refresh

// This function will handle token refresh requests
export async function POST(req, res) {
  console.log('Refreshing token...');

  try {
    // Get the current token from the request
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    console.log('Current token:', JSON.stringify(token, null, 2));

    // If there's no token, the user is not authenticated
    if (!token) {
      console.log('No token found');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Call the token refresh logic defined in [...nextauth]/options.js
    const refreshedToken = await refreshAccessToken(token);
    console.log('Refreshed token:', JSON.stringify(refreshedToken, null, 2));

    // Handle error in refreshing token
    if (refreshedToken.error) {
      console.log('Error refreshing token:', refreshedToken.error);
      return res.status(401).json({ error: refreshedToken.error });
    }

    // Return the new token if refresh was successful
    return res.status(200).json(refreshedToken);

  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
}
