// API endpoint to get PostHog configuration at runtime
// This allows us to use server-side environment variables

export async function GET() {
  // Get PostHog configuration from environment variables
  const config = {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY || null,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    enabled: !!process.env.NEXT_PUBLIC_POSTHOG_KEY
  };

  // Return configuration as JSON
  return Response.json(config);
}