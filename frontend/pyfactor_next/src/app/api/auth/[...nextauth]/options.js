
///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...nextauth]/options.js
import GoogleProvider from "next-auth/providers/google";
import axios from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);
console.log("NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET);
console.log("NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);

async function refreshAccessToken(token) {
    console.log('Refreshing access token:', JSON.stringify(token, null, 2));
    try {
      const url = "https://oauth2.googleapis.com/token";
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      });
  
      console.log('Refresh token request params:', params.toString());
  
      const response = await axios.post(url, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
  
      console.log('Refresh token response:', JSON.stringify(response.data, null, 2));
  
      const refreshedTokens = response.data;
  
      if (response.status !== 200) {
        throw refreshedTokens;
      }
  
      console.log('Refresh successful, new tokens:', JSON.stringify(refreshedTokens, null, 2));
  
      return {
        ...token,
        accessToken: refreshedTokens.access_token,
        accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      };
    } catch (error) {
      console.error("RefreshAccessTokenError", error);
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }
  }
  
export const options = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      }
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error: (code, metadata) => console.error(`Error: ${code}`, metadata),
    warn: (code) => console.warn(`Warning: ${code}`),
    debug: (code, metadata) => console.debug(`Debug: ${code}`, metadata),
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("Sign-in callback initiated");
      if (account.provider === "google") {
        try {
          const response = await axios.post(`${apiBaseUrl}/api/social-login/`, {
            provider: account.provider,
            access_token: account.access_token,
            id_token: account.id_token,
          });

          if (response.status === 200) {
            console.log("Social login successful");
            user.id = response.data.user_id;
            user.isOnboarded = response.data.is_onboarded;
            return true;
          } else {
            console.error("Social login failed:", response.data.error);
            return `/login?error=${encodeURIComponent(response.data.error)}`;
          }
        } catch (error) {
          console.error("Error during social login:", error.message);
          return `/login?error=${encodeURIComponent(error.message)}`;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at * 1000,
          user: {
            id: user.id,
            isOnboarded: user.isOnboarded,
          },
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.user.id = token.user.id;
      session.user.isOnboarded = token.user.isOnboarded;
      session.accessToken = token.accessToken;
      session.error = token.error;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  events: {
    async signIn(message) { console.log('signIn', message) },
    async signOut(message) { console.log('signOut', message) },
    async createUser(message) { console.log('createUser', message) },
    async linkAccount(message) { console.log('linkAccount', message) },
    async session(message) { console.log('session', message) },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default options;