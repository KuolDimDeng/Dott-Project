import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { logger } from '@/utils/logger';

/**
 * NextAuth configuration
 */
export const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // This is a placeholder for actual authentication logic
          // In a real implementation, you'd verify credentials against your backend
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Example: Call your API to verify credentials
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/api/auth/login/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            logger.error('Authentication failed:', data);
            return null;
          }

          // Return the user object with access token
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name || data.user.email.split('@')[0],
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          };
        } catch (error) {
          logger.error('Error in authorize function:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account) {
        // Add access token and user details to the token
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add custom values to the session
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.userId = token.userId;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'replace-with-secure-secret',
  debug: process.env.NODE_ENV !== 'production',
};

// Export handler function
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 