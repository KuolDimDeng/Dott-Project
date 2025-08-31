import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const data = await request.json();
        
        // Forward to Django backend
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/moderation/report/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to submit report');
        }
        
        return NextResponse.json(result);
        
    } catch (error) {
        console.error('Error submitting report:', error);
        return NextResponse.json(
            { 
                success: false, 
                message: error.message || 'Failed to submit report' 
            },
            { status: 500 }
        );
    }
}