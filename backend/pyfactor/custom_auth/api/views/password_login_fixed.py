"""
Fixed Password Login View
Handles transaction issues properly
"""

import logging
import requests
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.db import transaction
from django.conf import settings
from custom_auth.models import Tenant
from session_manager.services import session_service

logger = logging.getLogger(__name__)
User = get_user_model()


class PasswordLoginViewFixed(APIView):
    """
    Fixed version of PasswordLoginView with proper transaction handling
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        logger.info("🔐 [PASSWORD_LOGIN_FIXED] Starting password login flow")
        
        try:
            # Extract credentials
            email = request.data.get('email', '').strip().lower()
            password = request.data.get('password', '')
            
            if not email or not password:
                return Response({
                    'error': 'Email and password are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Authenticate with Auth0
            auth0_domain = settings.AUTH0_DOMAIN
            client_id = settings.AUTH0_CLIENT_ID
            client_secret = settings.AUTH0_CLIENT_SECRET
            audience = settings.AUTH0_AUDIENCE or f'https://{auth0_domain}/api/v2/'
            
            auth_url = f'https://{auth0_domain}/oauth/token'
            auth_payload = {
                'grant_type': 'password',
                'username': email,
                'password': password,
                'client_id': client_id,
                'client_secret': client_secret,
                'audience': audience,
                'scope': 'openid profile email offline_access'
            }
            
            auth_response = requests.post(auth_url, json=auth_payload)
            
            if auth_response.status_code != 200:
                logger.error(f"Auth0 authentication failed: {auth_response.text}")
                return Response({
                    'error': 'Invalid email or password'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            auth_data = auth_response.json()
            access_token = auth_data.get('access_token')
            
            # Get user info from Auth0
            userinfo_url = f'https://{auth0_domain}/userinfo'
            userinfo_response = requests.get(
                userinfo_url,
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if userinfo_response.status_code != 200:
                logger.error(f"Failed to get user info: {userinfo_response.text}")
                return Response({
                    'error': 'Failed to retrieve user information'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            userinfo = userinfo_response.json()
            auth0_sub = userinfo.get('sub')
            email = userinfo.get('email', email)
            
            # Handle user and session creation with proper transaction management
            user = None
            session = None
            
            # First transaction: Get or create user
            try:
                with transaction.atomic():
                    user, created = User.objects.get_or_create(
                        auth0_sub=auth0_sub,
                        defaults={
                            'email': email,
                            'is_active': True
                        }
                    )
                    
                    if created:
                        logger.info(f"Created new user: {user.id}")
                    
                    # Check if account is closed
                    if hasattr(user, 'account_closed') and user.account_closed:
                        return Response({
                            'error': 'This account has been closed.'
                        }, status=status.HTTP_403_FORBIDDEN)
                    
                    # Get tenant
                    tenant = None
                    if hasattr(user, 'tenant_id') and user.tenant_id:
                        try:
                            tenant = Tenant.objects.get(id=user.tenant_id)
                        except Tenant.DoesNotExist:
                            pass
                    elif hasattr(user, 'business_id') and user.business_id:
                        try:
                            tenant = Tenant.objects.get(id=user.business_id)
                        except Tenant.DoesNotExist:
                            pass
            except Exception as e:
                logger.error(f"Error getting/creating user: {e}", exc_info=True)
                return Response({
                    'error': 'Failed to process user account'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Second step: Create session (outside transaction to avoid nesting)
            try:
                session = session_service.create_session(
                    user=user,
                    tenant=tenant,
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    access_token=access_token  # Add the missing access_token parameter
                )
                
                logger.info(f"Session created: {session.session_id}")
                
            except Exception as e:
                logger.error(f"Error creating session: {e}", exc_info=True)
                # Try a simpler session creation as fallback
                try:
                    from session_manager.models import UserSession
                    from datetime import timedelta
                    from django.utils import timezone
                    
                    session = UserSession.objects.create(
                        user=user,
                        tenant=tenant,
                        ip_address=self.get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        expires_at=timezone.now() + timedelta(hours=24)
                    )
                    logger.info(f"Fallback session created: {session.session_id}")
                except Exception as fallback_error:
                    logger.error(f"Fallback session creation failed: {fallback_error}")
                    return Response({
                        'error': 'Failed to create session'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Prepare response
            response_data = {
                'success': True,
                'session_id': str(session.session_id),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'name': user.get_full_name() if hasattr(user, 'get_full_name') else user.email,
                    'onboarding_completed': getattr(user, 'onboarding_completed', False)
                }
            }
            
            if tenant:
                response_data['tenant'] = {
                    'id': str(tenant.id),
                    'name': getattr(tenant, 'business_name', '') or getattr(tenant, 'name', '')
                }
            
            response = Response(response_data)
            
            # Set session cookie
            response.set_cookie(
                'sid',
                str(session.session_id),
                max_age=86400,  # 24 hours
                httponly=True,
                secure=True,
                samesite='None'
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Unexpected error in password login: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip