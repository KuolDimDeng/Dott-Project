import { NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

export async function GET(request) {
  try {
    const response = await axiosInstance.get('/api/onboarding/setup/status');
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error('Failed to fetch setup status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setup status' },
      { status: error.response?.status || 500 }
    );
  }
}
