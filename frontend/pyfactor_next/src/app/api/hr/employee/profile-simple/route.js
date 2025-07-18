/**
 * Simple employee profile endpoint proxy
 */
import { NextResponse } from 'next/server';
import { getRequestHeaders } from '@/utils/auth';

export async function GET(request) {
    try {
        console.log('[HR Profile Simple] Making request to backend...');
        
        const response = await fetch(`${process.env.BACKEND_URL}/api/hr/employee/profile-simple/`, {
            method: 'GET',
            headers: await getRequestHeaders(request),
        });

        console.log('[HR Profile Simple] Response status:', response.status);
        const data = await response.json();
        console.log('[HR Profile Simple] Response data:', data);

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[HR Profile Simple] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}