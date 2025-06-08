import { NextResponse } from 'next/server';

export async function POST() {
  // Auth0 handles email confirmation automatically
  return NextResponse.json({ 
    error: 'This endpoint is deprecated. Auth0 handles email confirmation.' 
  }, { status: 410 });
}