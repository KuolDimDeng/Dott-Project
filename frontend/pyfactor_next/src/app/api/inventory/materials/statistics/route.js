import { NextResponse } from 'next/server';
import { proxyRequest } from '@/utils/proxyRequest';

export async function GET(request) {
  console.log('🎯 [Materials API] GET /api/inventory/materials/statistics - fetching stats');
  return proxyRequest(request, 'inventory/materials/statistics/');
}