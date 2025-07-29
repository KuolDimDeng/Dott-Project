import { NextResponse } from 'next/server';
import { proxyRequest } from '@/utils/proxyRequest';

export async function POST(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] POST /api/inventory/materials/${id}/update_stock - updating stock`);
  return proxyRequest(request, `inventory/materials/${id}/update_stock/`);
}