import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

/**
 * API endpoint for uploading user profile photos
 * Handles photo upload and storage
 */
export async function POST(request) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.debug(`[Upload Photo API] Processing photo upload, request ${requestId}`);
    
    // Check authentication
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    const sessionTokenCookie = cookieStore.get('session_token');
    const sessionCookie = cookieStore.get('dott_auth_session') || cookieStore.get('appSession');
    
    if (!sidCookie && !sessionTokenCookie && !sessionCookie) {
      logger.warn(`[Upload Photo API] No session found, request ${requestId}`);
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          message: 'Authentication required',
          requestId 
        },
        { status: 401 }
      );
    }
    
    // Get form data
    const formData = await request.formData();
    const file = formData.get('photo');
    
    if (!file) {
      return NextResponse.json(
        { 
          error: 'No file provided',
          message: 'Please select a photo to upload',
          requestId 
        },
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type',
          message: 'Please upload a valid image file (JPG, PNG, GIF, or WebP)',
          requestId 
        },
        { status: 400 }
      );
    }
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          error: 'File too large',
          message: 'Please upload an image smaller than 5MB',
          requestId 
        },
        { status: 400 }
      );
    }
    
    // Convert file to base64 for storage/transmission
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    
    // Get session ID for backend call
    const sessionId = sidCookie?.value || sessionTokenCookie?.value;
    
    if (sessionId) {
      // Use backend API to store the photo
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
      
      try {
        const response = await fetch(`${API_URL}/api/users/profile-photo/`, {
          method: 'POST',
          headers: {
            'Authorization': `Session ${sessionId}`,
            'Cookie': `session_token=${sessionId}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            photo: base64,
            content_type: file.type,
            filename: file.name
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          logger.info(`[Upload Photo API] Photo uploaded successfully via backend, request ${requestId}`);
          return NextResponse.json({
            photoUrl: data.photo_url || data.photoUrl,
            message: 'Photo uploaded successfully',
            requestId
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          logger.error(`[Upload Photo API] Backend upload failed: ${response.status}, request ${requestId}`);
          return NextResponse.json(
            { 
              error: 'Upload failed',
              message: errorData.detail || 'Failed to upload photo',
              requestId 
            },
            { status: response.status }
          );
        }
      } catch (error) {
        logger.error(`[Upload Photo API] Backend connection error: ${error.message}, request ${requestId}`);
        // Fall through to temporary storage
      }
    }
    
    // Temporary solution: store as data URL
    // In production, this would upload to a cloud storage service
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    logger.info(`[Upload Photo API] Photo processed successfully (temporary storage), request ${requestId}`);
    
    return NextResponse.json({
      photoUrl: dataUrl,
      message: 'Photo uploaded successfully (temporary storage)',
      requestId,
      temporary: true
    });
    
  } catch (error) {
    logger.error(`[Upload Photo API] Error processing upload: ${error.message}, request ${requestId}`);
    
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        message: error.message,
        requestId 
      },
      { status: 500 }
    );
  }
}