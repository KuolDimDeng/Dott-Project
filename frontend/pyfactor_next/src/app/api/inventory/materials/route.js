import { NextResponse } from 'next/server';
import { proxyRequest } from '@/utils/proxyRequest';

export async function GET(request) {
  console.log('🎯 [Materials API] GET /api/inventory/materials - proxying to backend');
  return proxyRequest(request, 'inventory/materials/');
}

export async function POST(request) {
  console.log('🎯 [Materials API] POST /api/inventory/materials - creating new material');
  return proxyRequest(request, 'inventory/materials/');
}