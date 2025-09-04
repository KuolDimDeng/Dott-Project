# Backend Auth0 Configuration for Mobile Support

## Industry-Standard Solution

To support both web and mobile applications with Auth0, your backend needs to accept tokens from multiple Auth0 applications. This is the industry-standard approach.

## Backend Configuration

Your Django backend needs to be configured to accept tokens from both:
1. Web App Client ID: `9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF`
2. Native App Client ID: `vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG`

### Option 1: Multiple Audiences (Recommended)

In your Django settings, update the Auth0 configuration:

```python
# settings.py
AUTH0_DOMAIN = 'dev-cbyy63jovi6zrcos.us.auth0.com'

# Accept tokens from multiple applications
AUTH0_ALLOWED_CLIENTS = [
    '9i7GSU4bgh6hFtMXnQACwiRxTudpuOSF',  # Web App
    'vltTnrxcC2ZMjlFel04Xeo7PlufLMEiG',  # Native Mobile App
]

# API Audience (if using)
AUTH0_API_AUDIENCE = 'https://api.dottapps.com'
```

### Option 2: Create a Custom API in Auth0 (Best Practice)

1. Go to Auth0 Dashboard → APIs
2. Create New API:
   - Name: `Dott Backend API`
   - Identifier: `https://api.dottapps.com`
   - Signing Algorithm: RS256

3. In both applications (Web and Native):
   - Add the API audience: `https://api.dottapps.com`
   - Request tokens with this audience

4. Update backend to validate against the API audience instead of client IDs

### Backend Token Validation Update

```python
# auth_middleware.py or auth_utils.py

def validate_auth0_token(token):
    """Validate Auth0 token from multiple clients"""
    
    # Decode and verify the token
    try:
        decoded = jwt.decode(
            token,
            key=get_auth0_public_key(),
            algorithms=['RS256'],
            audience=AUTH0_API_AUDIENCE,  # Validate API audience
            issuer=f'https://{AUTH0_DOMAIN}/'
        )
        
        # Check if the azp (authorized party) is allowed
        if 'azp' in decoded:
            if decoded['azp'] not in AUTH0_ALLOWED_CLIENTS:
                raise ValueError('Client not authorized')
        
        return decoded
        
    except Exception as e:
        logger.error(f'Token validation error: {e}')
        raise
```

## Mobile App Authentication Flow

1. **Authorization Code + PKCE** (Recommended)
   - Most secure for mobile apps
   - No client secret needed
   - Refresh tokens supported

2. **Password Grant** (Alternative)
   - Direct username/password
   - Requires Password grant enabled
   - Less secure but simpler UX

## Testing

Test both authentication methods:

```bash
# Web app token
curl -H "Authorization: Bearer WEB_APP_TOKEN" https://api.dottapps.com/api/sessions/create/

# Mobile app token
curl -H "Authorization: Bearer MOBILE_APP_TOKEN" https://api.dottapps.com/api/sessions/create/
```

## Security Considerations

1. Always use HTTPS
2. Implement token refresh
3. Store tokens securely (iOS Keychain / Android Keystore)
4. Implement proper logout
5. Use short token expiration times
6. Monitor for suspicious activity

## Next Steps

1. Update your backend to accept both client IDs
2. Or create a custom API audience
3. Test with both web and mobile tokens
4. Deploy to staging first