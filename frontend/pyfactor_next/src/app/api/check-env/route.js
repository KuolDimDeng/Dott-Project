import { NextResponse } from 'next/server';

export async function GET() {
  // Check API URL configuration
  const envCheck = {
    timestamp: new Date().toISOString(),
    NODE_ENV: process.env.NODE_ENV,
    apiConfiguration: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'NOT SET',
      BACKEND_API_URL: process.env.BACKEND_API_URL || 'NOT SET',
      isUsingDefaultApiUrl: !process.env.NEXT_PUBLIC_API_URL,
      actualApiUrlUsed: process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com (hardcoded default)'
    },
    deployment: {
      message: 'If NEXT_PUBLIC_API_URL is NOT SET, the app uses the hardcoded default',
      recommendation: 'Set NEXT_PUBLIC_API_URL in Render environment variables'
    },
    allNextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .sort()
      .map(key => ({
        name: key,
        hasValue: !!process.env[key],
        preview: key.includes('API') ? (process.env[key] || '').substring(0, 30) : 'SET'
      }))
  };

  return NextResponse.json(envCheck);
}