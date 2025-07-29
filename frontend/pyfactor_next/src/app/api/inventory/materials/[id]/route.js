import { NextResponse } from 'next/server';
import { proxyRequest } from '@/utils/proxyRequest';

export async function GET(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] GET /api/inventory/materials/${id} - fetching material`);
  return proxyRequest(request, `inventory/materials/${id}/`);
}

export async function PUT(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] PUT /api/inventory/materials/${id} - updating material`);
  return proxyRequest(request, `inventory/materials/${id}/`);
}

export async function PATCH(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] PATCH /api/inventory/materials/${id} - partial update`);
  return proxyRequest(request, `inventory/materials/${id}/`);
}

export async function DELETE(request, { params }) {
  const { id } = params;
  console.log(`🎯 [Materials API] DELETE /api/inventory/materials/${id} - deleting material`);
  return proxyRequest(request, `inventory/materials/${id}/`);
}