///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/api/auth/[...nextauth]/options.js
import GoogleProvider from "next-auth/providers/google";
import axios from 'axios';

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
  debug: true,
  logger: {
    error: (code, metadata) => {
      console.error(code, metadata)
    },
    warn: (code) => {
      console.warn(code)
    },
    debug: (code, metadata) => {
      console.debug(code, metadata)
    }
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("Sign in callback", { user, account, profile, email });
      if (account.provider === "google") {
        try {
          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/social-login/`, {
            provider: account.provider,
            access_token: account.access_token,
            id_token: account.id_token,
          });
          if (response.status === 200) {
            user.id = response.data.user_id;
            user.isOnboarded = response.data.is_onboarded;
            return true;
          } else {
            return false;
          }
        } catch (error) {
          console.error("Error during social login:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      console.log("JWT callback", { token, user, account });
      if (user) {
        token.id = user.id;
        token.isOnboarded = user.isOnboarded;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback", { session, token });
      session.user.id = token.id;
      session.user.isOnboarded = token.isOnboarded;
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};