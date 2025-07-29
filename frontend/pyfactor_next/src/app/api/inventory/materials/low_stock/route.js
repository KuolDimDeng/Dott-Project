import { NextResponse } from 'next/server';
import { proxyRequest } from '@/utils/proxyRequest';

export async function GET(request) {
  console.log('🎯 [Materials API] GET /api/inventory/materials/low_stock - fetching low stock items');
  return proxyRequest(request, 'inventory/materials/low_stock/');
}