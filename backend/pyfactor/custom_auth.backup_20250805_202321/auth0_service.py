"""
Auth0 Management API Service
Handles Auth0 user management operations
"""

import requests
import logging
import secrets
from datetime import datetime
from django.conf import settings
from django.core.cache import cache
from django.urls import reverse
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

class Auth0ManagementService:
    """Service for interacting with Auth0 Management API"""
    
    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.client_id = settings.AUTH0_CLIENT_ID
        self.client_secret = settings.AUTH0_CLIENT_SECRET
        self._token = None
        self._token_cache_key = 'auth0_mgmt_token'
    
    def get_management_token(self):
        """Get or refresh Auth0 Management API token"""
        # Check cache first
        cached_token = cache.get(self._token_cache_key)
        if cached_token:
            return cached_token
        
        try:
            response = requests.post(
                f"https://{self.domain}/oauth/token",
                json={
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'audience': f"https://{self.domain}/api/v2/",
                    'grant_type': 'client_credentials'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('access_token')
                expires_in = data.get('expires_in', 3600)
                
                # Cache token for slightly less than expiry time
                cache.set(self._token_cache_key, token, expires_in - 60)
                
                logger.info("[Auth0Service] Successfully obtained management token")
                return token
            else:
                logger.error(f"[Auth0Service] Failed to get management token: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"[Auth0Service] Error getting management token: {str(e)}")
            return None
    
    def update_user_metadata(self, auth0_sub, app_metadata):
        """Update user's app_metadata in Auth0"""
        token = self.get_management_token()
        if not token:
            logger.error("[Auth0Service] No management token available")
            return False
        
        try:
            response = requests.patch(
                f"https://{self.domain}/api/v2/users/{auth0_sub}",
                json={'app_metadata': app_metadata},
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"[Auth0Service] Successfully updated metadata for {auth0_sub}")
                return True
            else:
                logger.error(f"[Auth0Service] Failed to update metadata: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"[Auth0Service] Error updating user metadata: {str(e)}")
            return False
    
    def delete_user(self, auth0_sub):
        """Delete user from Auth0"""
        token = self.get_management_token()
        if not token:
            logger.error("[Auth0Service] No management token available")
            return False
        
        try:
            response = requests.delete(
                f"https://{self.domain}/api/v2/users/{auth0_sub}",
                headers={'Authorization': f'Bearer {token}'},
                timeout=10
            )
            
            if response.status_code == 204:
                logger.info(f"[Auth0Service] Successfully deleted user {auth0_sub}")
                return True
            else:
                logger.error(f"[Auth0Service] Failed to delete user: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"[Auth0Service] Error deleting user: {str(e)}")
            return False
    
    def block_user(self, auth0_sub):
        """Block user in Auth0 by updating blocked status"""
        return self.update_user_metadata(auth0_sub, {
            'blocked': True,
            'account_deleted': True,
            'deletion_timestamp': datetime.now().isoformat()
        })
    
    def create_user_with_invitation(self, email, role, tenant_id, invitation_token):
        """Create a user in Auth0 with password reset link as invitation"""
        token = self.get_management_token()
        if not token:
            logger.error("[Auth0Service] No management token available")
            return None
        
        try:
            # Generate a temporary password
            temp_password = secrets.token_urlsafe(32)
            
            # Create user in Auth0
            response = requests.post(
                f"https://{self.domain}/api/v2/users",
                json={
                    'connection': 'Username-Password-Authentication',
                    'email': email,
                    'password': temp_password,
                    'email_verified': False,
                    'verify_email': False,  # We'll send our own invitation
                    'app_metadata': {
                        'tenant_id': str(tenant_id),
                        'role': role,
                        'invitation_token': invitation_token,
                        'invited': True
                    }
                },
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                timeout=10
            )
            
            if response.status_code == 201:
                user_data = response.json()
                logger.info(f"[Auth0Service] Successfully created user {email}")
                return user_data
            else:
                logger.error(f"[Auth0Service] Failed to create user: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"[Auth0Service] Error creating user: {str(e)}")
            return None
    
    def send_password_reset_ticket(self, email, result_url=None):
        """Send password reset ticket which acts as invitation"""
        token = self.get_management_token()
        if not token:
            logger.error("[Auth0Service] No management token available")
            return None
        
        try:
            # If no result URL provided, use default
            if not result_url:
                result_url = f"{settings.FRONTEND_URL}/auth/accept-invitation"
            
            response = requests.post(
                f"https://{self.domain}/api/v2/tickets/password-change",
                json={
                    'email': email,
                    'connection_id': self._get_connection_id(),
                    'result_url': result_url,
                    'ttl_sec': 604800,  # 7 days
                    'mark_email_as_verified': True,
                    'includeEmailInRedirect': True
                },
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                timeout=10
            )
            
            if response.status_code == 201:
                ticket_data = response.json()
                logger.info(f"[Auth0Service] Successfully created password reset ticket for {email}")
                return ticket_data.get('ticket')
            else:
                logger.error(f"[Auth0Service] Failed to create password reset ticket: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"[Auth0Service] Error creating password reset ticket: {str(e)}")
            return None
    
    def _get_connection_id(self):
        """Get the connection ID for Username-Password-Authentication"""
        # This is typically cached or configured
        # For now, we'll fetch it
        token = self.get_management_token()
        if not token:
            return None
        
        try:
            response = requests.get(
                f"https://{self.domain}/api/v2/connections",
                params={'name': 'Username-Password-Authentication'},
                headers={'Authorization': f'Bearer {token}'},
                timeout=10
            )
            
            if response.status_code == 200:
                connections = response.json()
                if connections and len(connections) > 0:
                    return connections[0].get('id')
            
            return None
        except Exception as e:
            logger.error(f"[Auth0Service] Error getting connection ID: {str(e)}")
            return None

# Global instance
auth0_service = Auth0ManagementService()

def update_auth0_user_metadata(auth0_sub, metadata):
    """Helper function to update Auth0 user metadata"""
    return auth0_service.update_user_metadata(auth0_sub, metadata)

def delete_auth0_user(auth0_sub):
    """Helper function to delete Auth0 user"""
    return auth0_service.delete_user(auth0_sub)

def block_auth0_user(auth0_sub):
    """Helper function to block Auth0 user"""
    return auth0_service.block_user(auth0_sub)

def create_auth0_user_with_invitation(email, role, tenant_id, invitation_token):
    """Helper function to create Auth0 user with invitation"""
    return auth0_service.create_user_with_invitation(email, role, tenant_id, invitation_token)

def send_auth0_invitation_email(email, result_url=None):
    """Helper function to send Auth0 invitation email"""
    return auth0_service.send_password_reset_ticket(email, result_url)