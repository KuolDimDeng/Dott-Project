# User Account Management API Documentation

This document describes the new API endpoints created for the My Account feature in the application.

## Overview

These endpoints provide functionality for:
- Profile photo uploads
- Enhanced user profile data
- Session management (view and terminate sessions)
- Login history tracking

## Authentication

All endpoints require authentication. Include the session cookie or authentication token with each request.

## Endpoints

### 1. Upload Profile Photo

**Endpoint:** `POST /api/users/upload-photo/`

**Purpose:** Upload a new profile photo for the authenticated user

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `photo`: Image file (JPEG, PNG, GIF, WebP)
  - Max size: 5MB
  - Recommended dimensions: 400x400px

**Response:**
```json
{
  "photoUrl": "https://example.com/media/profile_photos/profile_123_abc.jpg",
  "message": "Profile photo uploaded successfully"
}
```

**Error Responses:**
- 400: Invalid file type or size too large
- 500: Server error processing image

### 2. Get Enhanced User Profile

**Endpoint:** `GET /api/users/profile/`

**Purpose:** Get comprehensive user profile data including verification status and metadata

**Response:**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "picture": "https://example.com/profile.jpg",
  "profilePhoto": "https://example.com/profile.jpg",
  "email_verified": true,
  "nickname": "john",
  "phone_number": "+1234567890",
  "created_at": "2024-01-01T00:00:00Z",
  "last_login": "2024-06-26T10:00:00Z",
  "mfa_enabled": false,
  "businessName": "Acme Corp",
  "businessType": "retail",
  "role": "OWNER",
  "tenantId": "tenant-123"
}
```

### 3. List User Sessions

**Endpoint:** `GET /api/users/sessions/`

**Purpose:** Get all active sessions for the authenticated user

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-123",
      "device_type": "desktop",
      "browser": "Chrome 120.0.0.0",
      "os": "Mac OS X 10.15.7",
      "ip_address": "192.168.1.1",
      "location": "Remote Location",
      "last_active": "5 minutes ago",
      "created_at": "2024-06-26T09:00:00Z",
      "expires_at": "2024-06-27T09:00:00Z",
      "is_current": true,
      "session_type": "web"
    }
  ],
  "total": 1
}
```

### 4. End Session

**Endpoint:** `DELETE /api/users/sessions/{session_id}/`

**Purpose:** Terminate a specific session (logout from a device)

**Parameters:**
- `session_id`: UUID of the session to terminate

**Response:**
```json
{
  "message": "Session ended successfully",
  "session_id": "session-123"
}
```

**Error Responses:**
- 400: Cannot end current session
- 404: Session not found
- 500: Server error

### 5. Get Login History

**Endpoint:** `GET /api/users/login-history/`

**Purpose:** Get login history for the last 30 days (max 50 entries)

**Response:**
```json
{
  "history": [
    {
      "id": "event-123",
      "timestamp": "2024-06-26T10:00:00Z",
      "ip_address": "192.168.1.1",
      "location": "Remote Location",
      "browser": "Chrome",
      "os": "Mac OS X",
      "success": true
    }
  ],
  "total": 1
}
```

## Implementation Notes

### Profile Photo Storage

- Photos are processed to 400x400px square format
- Stored in `MEDIA_ROOT/profile_photos/` directory
- Original aspect ratio is maintained with white padding
- JPEG format with 85% quality for optimal size

### Session Management

- Sessions are tracked via the `UserSession` model
- User agent parsing provides browser and OS information
- Current session cannot be terminated (must use logout)
- Sessions expire after 24 hours by default

### Security Considerations

- All endpoints require authentication
- File uploads are validated for type and size
- Sessions can only be managed by their owner
- IP addresses are tracked for security auditing

## Frontend Integration

The frontend My Account component (`MyAccount.js`) is already configured to use these endpoints:

```javascript
// Upload photo
const formData = new FormData();
formData.append('photo', file);
await fetch('/api/users/upload-photo/', {
  method: 'POST',
  body: formData
});

// Get sessions
const response = await fetch('/api/users/sessions/');
const data = await response.json();

// End session
await fetch(`/api/users/sessions/${sessionId}/`, {
  method: 'DELETE'
});
```

## Testing

Run the test script to verify endpoints are working:

```bash
python manage.py shell < test_user_api_endpoints.py
```

## Future Enhancements

1. **GeoIP Integration**: Add real location tracking using MaxMind or similar service
2. **Profile Photo CDN**: Store photos in S3/CloudFront for better performance
3. **Session Analytics**: Track session duration and activity patterns
4. **2FA Management**: Add endpoints for enabling/disabling 2FA
5. **Password Change**: Add endpoint for password updates (currently redirects to Auth0)