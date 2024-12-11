// src/app/api/auth/refresh/route.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

export async function POST(req) {
  try {
    logger.info('Refresh token request received');

    // Get the current session token
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    logger.debug('Token received for refresh:', {
      hasToken: !!token,
      hasRefreshToken: !!token?.refreshToken,
    });

    if (!token?.refreshToken) {
      logger.error('No refresh token found');
      return NextResponse.json({ error: 'No refresh token available' }, { status: 401 });
    }

    // Make request to your backend API
    const response = await axiosInstance.post(
      '/api/token/refresh/',
      { refresh: token.refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data?.access) {
      throw new Error('Invalid refresh response');
    }

    const refreshedToken = {
      ...token,
      accessToken: response.data.access,
      refreshToken: response.data.refresh || token.refreshToken,
      accessTokenExpires: Date.now() + (response.data.expires_in || 3600) * 1000,
      error: null,
    };

    logger.info('Token refreshed successfully');

    return NextResponse.json(refreshedToken);
  } catch (error) {
    logger.error('Token refresh failed:', error);

    // Handle different error types
    if (error.response?.status === 401) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    if (error.response?.status === 404) {
      return NextResponse.json({ error: 'Refresh endpoint not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Failed to refresh token',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS if needed
export async function OPTIONS(req) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
