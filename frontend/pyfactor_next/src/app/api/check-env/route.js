import { NextResponse } from 'next/server';

export async function GET() {
  // Check which environment variables are available
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    hasPostHogKey: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    hasPostHogHost: !!process.env.NEXT_PUBLIC_POSTHOG_HOST,
    postHogKeyLength: process.env.NEXT_PUBLIC_POSTHOG_KEY?.length || 0,
    postHogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'NOT SET',
    allNextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .map(key => ({
        name: key,
        hasValue: !!process.env[key],
        length: process.env[key]?.length || 0
      }))
  };

  return NextResponse.json(envCheck);
}