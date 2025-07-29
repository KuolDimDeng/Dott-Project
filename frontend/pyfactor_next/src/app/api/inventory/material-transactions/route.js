import { NextResponse } from 'next/server';
import { proxyRequest } from '@/utils/proxyRequest';

export async function GET(request) {
  console.log('🎯 [Materials API] GET /api/inventory/material-transactions - fetching transactions');
  return proxyRequest(request, 'inventory/material-transactions/');
}