import { Auth0Client } from '@auth0/nextjs-auth0/server';

const auth0 = new Auth0Client();

export async function GET(request) {
  return await auth0.middleware(request);
} 