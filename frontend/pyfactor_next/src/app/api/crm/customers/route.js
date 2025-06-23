import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';

// Helper function to decrypt session cookie
function decrypt(text) {
  try {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.SESSION_SECRET || 'dott-secret-key-2024-production-v1-encrypted32', 'utf8').slice(0, 32);
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Decrypt] Error:', error);
    return null;
  }
}

/**
 * Proxy for CRM customer API endpoints
 * Forwards requests to Django backend with proper authentication
 */
export async function GET(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Forward request to Django backend
    const response = await fetch(`${API_URL}/api/crm/customers/`, {
      method: 'GET',
      headers: {
        'Authorization': `SessionID ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[CRM Customers API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = cookies();
    
    // Get session ID from sid cookie
    const sidCookie = cookieStore.get('sid');
    if (!sidCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Forward request to Django backend
    const response = await fetch(`${API_URL}/api/crm/customers/`, {
      method: 'POST',
      headers: {
        'Authorization': `SessionID ${sidCookie.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[CRM Customers API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}