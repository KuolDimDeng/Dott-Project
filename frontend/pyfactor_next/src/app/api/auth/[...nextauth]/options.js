import GoogleProvider from "next-auth/providers/google";

async function refreshAccessToken(token) {
    console.log("Starting refreshAccessToken function...");
    console.log("Current token object:", token);

    if (!token.refreshToken) {
        console.warn("No refresh token available. Cannot refresh access token.");
        return { ...token, error: 'RefreshAccessTokenError', errorMessage: 'No refresh token provided' };
    }

    try {
        console.log("Sending refresh request with refresh token:", token.refreshToken);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: token.refreshToken }),
        });

        const rawResponse = await response.text();
        console.log("Raw response text received:", rawResponse);

        const refreshedTokens = JSON.parse(rawResponse);

        if (!response.ok) {
            console.error("Failed to refresh token:", {
                status: response.status,
                data: refreshedTokens,
            });
            throw new Error("Failed to refresh token");
        }

        console.log("Token refreshed successfully. New token data:", refreshedTokens);

        return {
            ...token,
            accessToken: refreshedTokens.access,
            accessTokenExpires: Date.now() + (refreshedTokens.expires_in || 3600) * 1000,
            refreshToken: refreshedTokens.refresh || token.refreshToken,
            user: {
                ...token.user,
                isOnboarded: refreshedTokens.isOnboarded !== undefined ? refreshedTokens.isOnboarded : token.user.isOnboarded
            }
        };
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return { ...token, error: 'RefreshAccessTokenError', errorMessage: error.message };
    }
}

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile",
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            console.log("SignIn callback triggered. Provider:", account.provider);
            console.log("User:", user);
            console.log("Account:", account);
            console.log("Profile:", profile);

            if (account.provider === 'google') {
                try {
                    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/social-login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            provider: 'google',
                            access_token: account.access_token,
                            id_token: account.id_token,
                            profile: profile, // Include profile data if needed by your backend
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("Social login error:", errorData);
                        throw new Error(errorData.error || 'Failed to create or update user');
                    }

                    const data = await response.json();
                    console.log("Social login successful:", data);

                    user.id = data.user_id;
                    user.isOnboarded = data.is_onboarded;
                } catch (error) {
                    console.error("Error during social login:", error);
                    throw error; // This will prevent sign in and show an error page
                }
            }
            return true; // Allow sign in
        },
        async jwt({ token, account, user }) {
            console.log("JWT callback triggered.");
            console.log("Token:", token);
            console.log("Account:", account);
            console.log("User:", user);

            if (account && user) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    accessTokenExpires: account.expires_in
                        ? Date.now() + account.expires_in * 1000
                        : Date.now() + 3600 * 1000,
                    refreshToken: account.refresh_token,
                    userId: user.id,
                    isOnboarded: user.isOnboarded,
                };
            }

            if (Date.now() < token.accessTokenExpires) {
                return token;
            }

            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            console.log("Session callback triggered.");
            console.log("Session:", session);
            console.log("Token:", token);

            session.user.id = token.userId;
            session.user.isOnboarded = token.isOnboarded;
            session.accessToken = token.accessToken;
            session.error = token.error;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
    cookies: {
        sessionToken: {
            name: 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV !== 'development',
            }
        },
        callbackUrl: {
            name: 'next-auth.callback-url',
            options: {
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV !== 'development',
            }
        },
        csrfToken: {
            name: 'next-auth.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV !== 'development',
            }
        },
    },
    logger: {
        error(code, metadata) {
            console.error("NextAuth Error:", code, metadata);
        },
        warn(code) {
            console.warn("NextAuth Warning:", code);
        },
        debug(code, metadata) {
            console.debug("NextAuth Debug:", code, metadata);
        },
    },
    debug: true, // Enable debug messages
};

console.log("NextAuth configuration loaded.");