"""
Auth0 Management API Service
Handles Auth0 user management operations
"""

import requests
import logging
from django.conf import settings
from django.core.cache import cache

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