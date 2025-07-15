# Custom Password Reset Flow Documentation

## Overview
This document describes the custom password reset flow implemented for admin-created users, which bypasses Auth0's default verification emails and provides a branded experience.

## Architecture

### Components
1. **Backend API** (`/auth/set-password/`)
2. **Frontend Page** (`/auth/set-password`)
3. **Email Service** (Resend)
4. **Database Model** (`PasswordResetToken`)
5. **Auth0 Management API**

## Flow Diagram

```
Admin Creates User → Backend Creates Auth0 User → Generate Reset Token
                                                          ↓
User Receives Email ← Send Custom Email ← Store Token in Database
        ↓
Click Reset Link → Validate Token → Show Password Form
        ↓
Submit New Password → Backend API → Update Auth0 via Management API
        ↓
Mark Token Used → Set User Active → User Can Login
```

## Detailed Implementation

### 1. User Creation (`DirectUserCreationViewSet`)
```python
# Location: /backend/pyfactor/custom_auth/views/rbac_views.py

def _create_auth0_user_and_send_reset(self, email, user, tenant):
    # 1. Create Auth0 user with temporary password
    temp_password = ''.join(random.choices(...)) + 'Aa1!'
    
    # 2. Create user in Auth0
    user_payload = {
        'email': email,
        'password': temp_password,
        'email_verified': True,  # Prevent verification emails
        'verify_email': False,   # Don't send Auth0 emails
    }
    
    # 3. Generate secure reset token
    reset_token = secrets.token_urlsafe(32)
    
    # 4. Store in database with 24-hour expiry
    PasswordResetToken.objects.create(
        user=user,
        token=reset_token,
        expires_at=timezone.now() + timedelta(hours=24)
    )
    
    # 5. Send custom email
    self._send_custom_password_reset_email(email, reset_token, tenant.name, user.role)
```

### 2. Password Reset Model
```python
# Location: /backend/pyfactor/custom_auth/models.py

class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def is_valid(self):
        return not self.used and self.expires_at > timezone.now()
```

### 3. Password Reset API
```python
# Location: /backend/pyfactor/custom_auth/views/password_reset_views.py

class PasswordResetView(APIView):
    def post(self, request):
        # 1. Validate token
        reset_token = PasswordResetToken.objects.get(token=token)
        
        # 2. Get Auth0 Management API token
        # 3. Update password in Auth0
        update_url = f"https://{domain}/api/v2/users/{user.auth0_sub}"
        update_payload = {
            'password': new_password,
            'connection': 'Username-Password-Authentication'
        }
        
        # 4. Mark token as used
        # 5. Set user as active and onboarding completed
```

### 4. Email Template
```html
<!-- Custom branded email -->
<h2>Welcome to {tenant_name}!</h2>
<p>Your account has been created with the role of <strong>{role}</strong>.</p>
<a href="{reset_url}">Set Your Password</a>
<p>This link will expire in 24 hours.</p>
```

### 5. Frontend Password Reset Page
```javascript
// Location: /frontend/pyfactor_next/src/app/auth/set-password/page.js

// 1. Validate token on page load
// 2. Show password form
// 3. Submit to backend API
// 4. Redirect to login on success
```

## Security Considerations

1. **Token Security**
   - 32-byte cryptographically secure random token
   - Single use (marked as used after password set)
   - 24-hour expiration
   - Token + email required for validation

2. **Auth0 Integration**
   - Uses Management API with M2M credentials
   - Updates password directly in Auth0
   - Marks email as verified to prevent Auth0 emails

3. **Email Security**
   - Sent via Resend (better deliverability)
   - From verified domain (no-reply@dottapps.com)
   - Contains no sensitive information

## Configuration

### Backend Environment Variables
```env
# Auth0 Management API
AUTH0_MANAGEMENT_CLIENT_ID=your_m2m_client_id
AUTH0_MANAGEMENT_CLIENT_SECRET=your_m2m_client_secret

# Email Service
RESEND_API_KEY=re_your_resend_api_key
DEFAULT_FROM_EMAIL=no-reply@dottapps.com
```

### Frontend Routes
- Password reset page: `/auth/set-password`
- API proxy: `/api/auth/set-password`

## Benefits

1. **Better User Experience**
   - Custom branded emails
   - Clear call-to-action
   - No confusing Auth0 verification emails

2. **Admin Control**
   - Full control over email content
   - Consistent branding
   - Clear user onboarding flow

3. **Security**
   - Secure token generation
   - Time-limited tokens
   - Single-use tokens
   - Auth0 password policies enforced

## Troubleshooting

### Email Not Received
1. Check Resend API key is configured
2. Verify domain in Resend dashboard
3. Check backend logs for email status
4. Verify user email is valid

### Token Invalid/Expired
- Tokens expire after 24 hours
- Each token can only be used once
- Generate new user to get new token

### Password Update Failed
- Check Auth0 Management API credentials
- Verify Auth0 password meets requirements
- Check backend logs for Auth0 response

## Testing

### Local Testing
```bash
# Create test user
1. Go to Admin Panel → User Management
2. Click "Add User"
3. Enter email and permissions
4. Check email for reset link
5. Set password and verify login
```

### Production Monitoring
- Monitor Resend dashboard for email delivery
- Check Sentry for any errors
- Review Auth0 logs for password updates