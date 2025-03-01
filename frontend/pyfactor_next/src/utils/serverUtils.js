import { cookies } from 'next/headers';
import { logger } from '@/utils/logger';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export async function validateServerSession() {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const idToken = cookieStore.get('idToken')?.value;

    if (!accessToken || !idToken) {
      throw new Error('No valid session tokens');
    }

    // Verify tokens
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
    });

    // Verify access token
    const payload = await verifier.verify(accessToken);

    // Create user object from token payload
    const user = {
      userId: payload.sub,
      username: payload.username,
      attributes: {
        'custom:onboarding': payload['custom:onboarding'] || 'NOT_STARTED'
      }
    };

    const tokens = {
      accessToken: { toString: () => accessToken },
      idToken: { toString: () => idToken }
    };

    logger.debug('[ServerUtils] Session tokens validated');

    return { tokens, user };
  } catch (error) {
    logger.error('[ServerUtils] Session validation failed:', error);
    throw error;
  }
}