import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Re-export the same handler for the /save route
export { POST } from '../route';