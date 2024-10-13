import GoogleProvider from "next-auth/providers/google";
import axios from 'axios';

async function exchangeGoogleToken(googleToken) {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/token-exchange/`, { token: googleToken });
    return response.data;
  } catch (error) {
    console.error('Token exchange failed:', error.message);
    throw error;
  }
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { access, refresh, user_id, onboarding_status } = await exchangeGoogleToken(account.id_token);
          user.access_token = access;
          user.refresh_token = refresh;
          user.id = user_id;
          user.onboardingStatus = onboarding_status;
          return true;
        } catch (error) {
          console.error("Google sign-in error:", error.message);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.access_token;
        token.refreshToken = user.refresh_token;
        token.userId = user.id;
        token.onboardingStatus = user.onboardingStatus;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = session.user || {};
      session.user.id = token.userId;
      session.user.onboardingStatus = token.onboardingStatus;
      session.user.accessToken = token.accessToken;
      session.user.refreshToken = token.refreshToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

console.log("NextAuth configuration loaded.");
