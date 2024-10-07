// frontend/pyfactor_next/src/app/api/auth/[...nextauth]/options.js
import GoogleProvider from "next-auth/providers/google";

const REFRESH_TOKEN_ERROR = "RefreshAccessTokenError";

async function refreshAccessToken(token) {
  console.log("Refreshing access token", { tokenId: token.sub });
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Failed to refresh token", { status: response.status, data: refreshedTokens });
      throw refreshedTokens;
    }

    console.log("Token refreshed successfully", { tokenId: token.sub });
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    return {
      ...token,
      error: REFRESH_TOKEN_ERROR,
    };
  }
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        console.log("Initial sign in", { userId: user.id, provider: account.provider });
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + account.expires_in * 1000,
          refreshToken: account.refresh_token,
          user,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        console.log("Existing token is still valid", { tokenId: token.sub });
        return token;
      }

      // Access token has expired, try to update it
      console.log("Access token has expired, refreshing...", { tokenId: token.sub });
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      console.log("Creating session", { userId: token.sub });
      session.user = token.user;
      session.accessToken = token.accessToken;
      session.error = token.error;

      // Fetch user data from your backend here and set isOnboarded
      if (token.accessToken) {
        try {
          console.log("Fetching user data from backend", { userId: token.sub });
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          });
          const userData = await response.json();
          session.user.isOnboarded = userData.isOnboarded;
          console.log("User data fetched successfully", { userId: token.sub, isOnboarded: userData.isOnboarded });
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }

      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    },
  },
  logger: {
    error(code, metadata) {
      console.error(code, metadata);
    },
    warn(code) {
      console.warn(code);
    },
    debug(code, metadata) {
      console.debug(code, metadata);
    }
  },
};

console.log("NextAuth configuration loaded");