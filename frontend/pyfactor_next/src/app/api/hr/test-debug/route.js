/**
 * Test debug endpoint proxy
 */
import { NextResponse } from 'next/server';
import { getRequestHeaders } from '@/utils/auth';

export async function GET(request) {
    try {
        console.log('[HR Test Debug] Making request to backend...');
        
        const response = await fetch(`${process.env.BACKEND_URL}/api/hr/test-debug/`, {
            method: 'GET',
            headers: await getRequestHeaders(request),
        });

        console.log('[HR Test Debug] Response status:', response.status);
        const data = await response.json();
        console.log('[HR Test Debug] Response data:', data);

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('[HR Test Debug] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}