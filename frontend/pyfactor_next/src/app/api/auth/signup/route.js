import { NextResponse } from 'next/server';
import logger from '@/utils/logger';

// Simple email validation for development
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Basic password strength check for development
const isStrongPassword = (password) => {
  return password.length >= 6; // Relaxed requirement for development
};

export async function POST(req) {
  logger.debug('POST request received at /api/auth/signup');
  try {
    const body = await req.json();
    logger.debug('Received signup data', { email: body.email });

    const { email, password1, password2 } = body;

    // Validate input
    if (!email || !password1 || !password2) {
      logger.warn('Invalid signup data', {
        email,
        hasPassword1: !!password1,
        hasPassword2: !!password2,
      });
      return NextResponse.json(
        { message: 'Email, password, and password confirmation are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      logger.warn('Invalid email format', { email });
      return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
    }

    if (!isStrongPassword(password1)) {
      logger.warn('Weak password');
      return NextResponse.json(
        { message: 'Password should be at least 6 characters long' },
        { status: 400 }
      );
    }

    if (password1 !== password2) {
      logger.warn('Password mismatch during signup');
      return NextResponse.json({ message: 'Passwords do not match' }, { status: 400 });
    }

    // Make a request to your Django backend API
    logger.debug('Sending request to backend', {
      url: `${process.env.NEXT_PUBLIC_API_URL}/api/signup/`,
    });
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/signup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password1, password2 }),
      credentials: 'include', // Include cookies in the request
    });

    logger.debug('Received response from backend', {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      logger.error('Backend error', errorData);
      return NextResponse.json(
        { message: errorData.message || 'An error occurred during signup' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    logger.debug('Successful signup', { userId: data.id });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    logger.error('Signup error', { error: error.message, stack: error.stack });
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
