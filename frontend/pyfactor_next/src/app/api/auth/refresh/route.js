export async function POST(req) {
  try {
    console.log("Refresh token request received.");
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    console.log("Token received for refresh:", token);

    if (!token) {
      console.log("No token found for refresh");
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const refreshedToken = await refreshAccessToken(token);
    console.log("Refreshed token response:", refreshedToken);

    if (refreshedToken.error) {
      console.error("Token refresh error:", refreshedToken.error);
      // Sign the user out if refresh fails
      return NextResponse.json({ error: refreshedToken.error }, { status: 401 });
    }

    return NextResponse.json(refreshedToken);
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}