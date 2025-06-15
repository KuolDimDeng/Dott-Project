import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('[TEST-COOKIE] Testing cookie setting mechanism');
  
  // Get current cookies
  const cookieStore = await cookies();
  const currentCookie = cookieStore.get('test_cookie');
  console.log('[TEST-COOKIE] Current test_cookie:', currentCookie);
  
  // Create response
  const response = NextResponse.json({
    message: 'Cookie test',
    currentValue: currentCookie?.value || null,
    timestamp: new Date().toISOString()
  });
  
  // Try different cookie setting methods
  console.log('[TEST-COOKIE] Method 1: Using response.cookies.set');
  response.cookies.set('test_cookie', 'method1_value', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 // 1 hour
  });
  
  console.log('[TEST-COOKIE] Method 2: Using Set-Cookie header');
  response.headers.append(
    'Set-Cookie',
    `test_cookie2=method2_value; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax; Max-Age=3600`
  );
  
  console.log('[TEST-COOKIE] Response headers:', Object.fromEntries(response.headers.entries()));
  
  return response;
}

export async function POST() {
  console.log('[TEST-COOKIE] POST: Testing cookie deletion and setting');
  
  const cookieStore = await cookies();
  const currentCookie = cookieStore.get('test_cookie');
  console.log('[TEST-COOKIE] POST: Current cookie before delete:', currentCookie);
  
  // Create response
  const response = NextResponse.json({
    message: 'Cookie delete and set test',
    beforeValue: currentCookie?.value || null,
    timestamp: new Date().toISOString()
  });
  
  // Delete then set
  console.log('[TEST-COOKIE] POST: Deleting cookie');
  response.cookies.delete('test_cookie');
  
  console.log('[TEST-COOKIE] POST: Setting new cookie');
  response.cookies.set('test_cookie', 'new_value_' + Date.now(), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 // 1 hour
  });
  
  console.log('[TEST-COOKIE] POST: Response headers:', Object.fromEntries(response.headers.entries()));
  
  return response;
}