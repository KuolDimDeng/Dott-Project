import { NextResponse } from 'next/server';

// Dynamic import to avoid build-time issues
const getAuth0 = async () => {
  try {
    const auth0 = await import('@auth0/nextjs-auth0');
    return auth0;
  } catch (error) {
    console.error('Failed to load Auth0:', error);
    return null;
  }
};

export async function GET(request, { params }) {
  const auth0 = await getAuth0();
  
  if (!auth0 || !auth0.handleAuth) {
    return NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
  }

  const handlers = auth0.handleAuth({
    login: {
      returnTo: '/dashboard'
    },
    logout: {
      returnTo: '/'
    },
    callback: {
      afterCallback: async (req, session, state) => {
        console.log('Auth0 callback successful:', {
          user: session.user?.email,
          returnTo: state?.returnTo || '/dashboard'
        });
        return session;
      }
    }
  });

  // Call the GET handler
  return handlers.GET(request, { params });
}

export async function POST(request, { params }) {
  const auth0 = await getAuth0();
  
  if (!auth0 || !auth0.handleAuth) {
    return NextResponse.json({ error: 'Auth0 not configured' }, { status: 503 });
  }

  const handlers = auth0.handleAuth({
    login: {
      returnTo: '/dashboard'
    },
    logout: {
      returnTo: '/'
    }
  });

  // Call the POST handler
  return handlers.POST(request, { params });
}