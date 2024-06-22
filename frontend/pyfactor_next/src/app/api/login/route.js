// app/api/login/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  const body = await request.json();

  try {
    // Send the login request to the Django backend
    const response = await axios.post('http://localhost:8000/api/token/', body);

    // Extract the token from the response
    const { token } = response.data;

    // Return the token in the response
    return NextResponse.json({ token });
  } catch (error) {
    logger.error('Error during login:', error);
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
}

export async function GET(request) {
  // Handle GET requests if needed
  return NextResponse.json({ message: 'This is a GET request' });
}