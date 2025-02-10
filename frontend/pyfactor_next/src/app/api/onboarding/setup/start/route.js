import { NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';

export async function POST(request) {
  try {
    const response = await axiosInstance.post('/api/onboarding/setup/start');
    return NextResponse.json(response.data);
  } catch (error) {
    logger.error('Failed to start setup:', error);
    return NextResponse.json(
      { error: 'Failed to start setup process' },
      { status: error.response?.status || 500 }
    );
  }
}
