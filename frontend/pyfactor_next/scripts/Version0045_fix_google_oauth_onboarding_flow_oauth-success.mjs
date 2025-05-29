#!/usr/bin/env node

/**
 * Version 0045: Fix Google OAuth Onboarding Flow
 * 
 * ISSUE ANALYSIS:
 * - Google OAuth users authenticate successfully but don't get directed to onboarding
 * - Missing backend endpoints for user creation and profile retrieval
 * - Email verification issues for OAuth users
 * - Missing custom attributes (tenant_ID) in Cognito
 * - OAuth flow lacks proper user creation in backend database
 * 
 * SOLUTION:
 * 1. Create missing backend endpoints for user signup and profile
 * 2. Fix OAuth success page to handle new users properly  
 * 3. Ensure proper onboarding flow redirection
 * 4. Add email verification handling for OAuth users
 * 5. Implement proper error handling and fallbacks
 * 
 * Version: v1.0
 * Date: 2025-05-29
 * Author: System Fix
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

console.log('🔧 Starting Google OAuth Onboarding Flow Fix v1.0...\n');

// Helper function to backup files
function backupFile(filePath) {
    if (fs.existsSync(filePath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.backup_${timestamp}`;
        fs.copyFileSync(filePath, backupPath);
        console.log(`📁 Backed up: ${path.basename(filePath)}`);
        return backupPath;
    }
    return null;
}

// Helper function to ensure directory exists
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
    }
}

// Step 1: Create missing backend user endpoints
console.log('Step 1: Creating missing backend user endpoints...');

const backendAuthViewsPath = path.join(rootDir, 'backend/pyfactor/custom_auth/api/views/auth_views.py');

// Backup current auth_views.py
backupFile(backendAuthViewsPath);

// Create enhanced auth_views.py with user creation endpoints
const enhancedAuthViews = `import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import get_object_or_404
from custom_auth.models import Tenant
from django.utils import timezone
from django.db import IntegrityError, transaction
import uuid
import json
import traceback

logger = logging.getLogger('Pyfactor')
User = get_user_model()

class VerifyCredentialsView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = get_object_or_404(User, email=email)
            if check_password(password, user.password):
                return Response({'success': True})
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

class SignUpView(APIView):
    """
    Handle OAuth user creation when they sign up via Google/external providers.
    This endpoint is called by the Lambda post-confirmation trigger.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            request_id = str(uuid.uuid4())
            logger.info(f"[SignUp:{request_id}] New user signup request")
            
            # Extract user data from request
            email = request.data.get('email')
            cognito_id = request.data.get('cognitoId')
            first_name = request.data.get('firstName', '')
            last_name = request.data.get('lastName', '')
            user_role = request.data.get('userRole', 'owner')
            is_verified = request.data.get('is_already_verified', True)
            
            logger.info(f"[SignUp:{request_id}] Processing signup for email: {email}, cognitoId: {cognito_id}")
            
            if not email or not cognito_id:
                logger.error(f"[SignUp:{request_id}] Missing required fields")
                return Response({
                    'success': False,
                    'error': 'Email and Cognito ID are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                # Check if user already exists
                existing_user = User.objects.filter(email=email).first()
                if existing_user:
                    logger.info(f"[SignUp:{request_id}] User already exists, updating cognito_id")
                    # Update cognito_id if needed
                    if existing_user.cognito_id != cognito_id:
                        existing_user.cognito_id = cognito_id
                        existing_user.save(update_fields=['cognito_id'])
                    
                    return Response({
                        'success': True,
                        'message': 'User already exists',
                        'user_id': str(existing_user.id),
                        'onboarding_status': existing_user.onboarding_status
                    })
                
                # Create new user
                user_data = {
                    'email': email,
                    'cognito_id': cognito_id,
                    'first_name': first_name,
                    'last_name': last_name,
                    'username': email,  # Use email as username
                    'is_active': True,
                    'is_verified': is_verified,
                    'user_role': user_role,
                    'onboarding_status': 'not_started',
                    'date_joined': timezone.now()
                }
                
                # Generate a random password for OAuth users (they won't use it)
                user_data['password'] = make_password(str(uuid.uuid4()))
                
                user = User.objects.create(**user_data)
                logger.info(f"[SignUp:{request_id}] Created user {user.id} for email {email}")
                
                return Response({
                    'success': True,
                    'message': 'User created successfully',
                    'user_id': str(user.id),
                    'onboarding_status': user.onboarding_status
                })
                
        except IntegrityError as e:
            logger.error(f"[SignUp:{request_id}] IntegrityError: {str(e)}")
            # Try to get the existing user
            try:
                existing_user = User.objects.get(email=email)
                return Response({
                    'success': True,
                    'message': 'User already exists',
                    'user_id': str(existing_user.id),
                    'onboarding_status': existing_user.onboarding_status
                })
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Database integrity error',
                    'detail': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"[SignUp:{request_id}] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'Internal server error',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(APIView):
    """
    Get user profile information for authenticated users.
    This endpoint is called by the frontend after OAuth login.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            request_id = str(uuid.uuid4())
            user = request.user
            logger.info(f"[UserProfile:{request_id}] Getting profile for user {user.id}")
            
            # Get user's tenant if exists
            tenant = None
            tenant_id = None
            try:
                tenant = Tenant.objects.filter(owner_id=user.id).first()
                if tenant:
                    tenant_id = str(tenant.id)
                    logger.info(f"[UserProfile:{request_id}] Found tenant {tenant_id} for user {user.id}")
            except Exception as e:
                logger.warning(f"[UserProfile:{request_id}] Error getting tenant: {str(e)}")
            
            # Build profile response
            profile_data = {
                'id': str(user.id),
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'cognito_id': getattr(user, 'cognito_id', None),
                'user_role': getattr(user, 'user_role', 'owner'),
                'onboarding_status': getattr(user, 'onboarding_status', 'not_started'),
                'is_verified': getattr(user, 'is_verified', False),
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'tenant_id': tenant_id,
                'tenantId': tenant_id,  # Alternative naming for frontend compatibility
                'setup_done': getattr(user, 'onboarding_status', '') == 'complete'
            }
            
            # Add custom attributes if available
            if hasattr(user, 'current_step'):
                profile_data['current_step'] = user.current_step
            if hasattr(user, 'next_step'):
                profile_data['next_step'] = user.next_step
            if hasattr(user, 'selected_plan'):
                profile_data['selected_plan'] = user.selected_plan
                
            logger.info(f"[UserProfile:{request_id}] Profile retrieved successfully")
            return Response(profile_data)
            
        except Exception as e:
            logger.error(f"[UserProfile:{request_id}] Error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to get user profile',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request):
        """Update user profile information"""
        try:
            request_id = str(uuid.uuid4())
            user = request.user
            logger.info(f"[UserProfile:{request_id}] Updating profile for user {user.id}")
            
            # Fields that can be updated
            updatable_fields = [
                'first_name', 'last_name', 'onboarding_status', 
                'current_step', 'next_step', 'selected_plan'
            ]
            
            updated_fields = []
            for field in updatable_fields:
                if field in request.data and hasattr(user, field):
                    setattr(user, field, request.data[field])
                    updated_fields.append(field)
            
            if updated_fields:
                user.save(update_fields=updated_fields)
                logger.info(f"[UserProfile:{request_id}] Updated fields: {updated_fields}")
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'updated_fields': updated_fields
            })
            
        except Exception as e:
            logger.error(f"[UserProfile:{request_id}] Update error: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to update user profile',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifySessionView(APIView):
    """
    Verify the user's session and return session data
    Required by the frontend to validate authentication
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        request_id = str(uuid.uuid4())
        logger.debug(f"Session verification request {request_id}")
        
        if not request.user.is_authenticated:
            logger.debug(f"Session verification failed - user not authenticated {request_id}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
        
        try:
            # Return basic user session data
            logger.debug(f"Session verification successful for user {request.user.id} {request_id}")
            response_data = {
                'isLoggedIn': True,
                'authenticated': True,
                'user': {
                    'id': str(request.user.id),
                    'email': request.user.email,
                    'lastLogin': request.user.last_login.isoformat() if request.user.last_login else None,
                },
                'requestId': request_id
            }
            
            # Add onboarding status if available
            if hasattr(request.user, 'onboarding_status'):
                response_data['user']['onboardingStatus'] = request.user.onboarding_status
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error verifying session: {str(e)}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'error': str(e),
                'requestId': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CheckUserAttributesView(APIView):
    """
    Check and return the user's cognito attributes
    Required by the frontend to determine user state
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        request_id = str(uuid.uuid4())
        logger.debug(f"Attribute check request {request_id}")
        
        if not request.user.is_authenticated:
            logger.debug(f"Attribute check failed - user not authenticated {request_id}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
        
        try:
            # Gather all user attributes
            attributes = {}
            
            # Map Django User model fields to attribute names
            if hasattr(request.user, 'email'):
                attributes['email'] = request.user.email
                
            # Custom fields we may have on the User model
            custom_fields = [
                'onboarding_status', 'current_step', 'next_step',
                'selected_plan', 'database_status', 'setup_status'
            ]
            
            for field in custom_fields:
                if hasattr(request.user, field):
                    value = getattr(request.user, field)
                    # Convert to camelCase for frontend
                    camel_case_field = ''.join([field.split('_')[0]] + 
                                     [w.capitalize() for w in field.split('_')[1:]])
                    attributes[camel_case_field] = value
            
            # Add basic preferences if not present
            if 'preferences' not in attributes:
                attributes['preferences'] = json.dumps({
                    "notifications": True,
                    "theme": "light",
                    "language": "en"
                })
                
            logger.debug(f"Attribute check successful for user {request.user.id} {request_id}")
            return Response({
                'isLoggedIn': True,
                'authenticated': True,
                'attributes': attributes,
                'requestId': request_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking user attributes: {str(e)}")
            return Response({
                'isLoggedIn': False,
                'authenticated': False,
                'error': str(e),
                'requestId': request_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyTenantView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Verify that the provided tenant ID is correct for this user"""
        try:
            tenant_id = request.data.get('tenantId')
            
            # Log the verification attempt
            logger.info(f"Tenant verification request for user {request.user.id} with tenantId: {tenant_id}")
            
            # CRITICAL: Always check if the user has ANY existing tenant first
            existing_tenant = Tenant.objects.filter(owner=request.user).first()
            
            if existing_tenant:
                # User has a tenant - check if the ID matches
                if str(existing_tenant.id) != tenant_id:
                    logger.warning(f"Tenant ID mismatch for user {request.user.id}: provided {tenant_id} but actual is {existing_tenant.id}")
                    return Response({
                        'status': 'corrected',
                        'message': 'The provided tenant ID is incorrect for this user',
                        'correctTenantId': str(existing_tenant.id),
                        'correctSchemaName': existing_tenant.id
                    })
                else:
                    # Tenant ID is correct
                    return Response({
                        'status': 'verified',
                        'message': 'Tenant ID verified successfully'
                    })
            else:
                # User has no tenant yet - acquire lock before creating
                from custom_auth.utils import acquire_user_lock, release_user_lock
                
                if not acquire_user_lock(request.user.id):
                    return Response({
                        'status': 'error',
                        'message': 'System busy, please try again'
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                
                try:
                    # Double-check if a tenant was created while waiting for lock
                    existing_tenant = Tenant.objects.filter(owner=request.user).first()
                    if existing_tenant:
                        return Response({
                            'status': 'corrected',
                            'message': 'Tenant was created by another process',
                            'correctTenantId': str(existing_tenant.id),
                            'correctSchemaName': existing_tenant.id
                        })
                    
                    # Create a tenant with the provided ID
                    schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                    tenant = Tenant.objects.create(
                        id=tenant_id,
                        schema_name=schema_name,
                        name=f"Tenant for {request.user.email}",
                        owner=request.user,
                        created_on=timezone.now(),
                        is_active=True,
                        setup_status='not_started'
                    )
                    
                    return Response({
                        'status': 'created',
                        'message': 'Tenant created successfully',
                        'tenantId': str(tenant.id),
                        'schemaName':  tenant.id
                    })
                finally:
                    release_user_lock(request.user.id)
        except IntegrityError as e:
            if 'owner_id' in str(e):
                # Race condition - try to fetch the existing tenant
                existing_tenant = Tenant.objects.filter(owner=request.user).first()
                if existing_tenant:
                    return Response({
                        'status': 'corrected',
                        'message': 'Tenant already exists for this user',
                        'correctTenantId': str(existing_tenant.id),
                        'correctSchemaName': existing_tenant.id
                    })
            logger.error(f"IntegrityError in tenant verification: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Database integrity error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Error verifying tenant: {str(e)}")
            return Response({
                'status': 'error',
                'message': 'Error verifying tenant',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
`;

fs.writeFileSync(backendAuthViewsPath, enhancedAuthViews);
console.log('✅ Enhanced backend auth_views.py with user creation endpoints');

// Step 2: Update backend URLs to include new endpoints
console.log('\nStep 2: Updating backend URL configuration...');

const backendUrlsPath = path.join(rootDir, 'backend/pyfactor/custom_auth/api/urls.py');
backupFile(backendUrlsPath);

const enhancedUrls = `from django.urls import path
from .views.auth_views import (
    VerifyCredentialsView, VerifySessionView, CheckUserAttributesView, 
    SignUpView, UserProfileView, VerifyTenantView
)
from .views.tenant_views import (
    TenantDetailView, TenantExistsView, CurrentTenantView, ValidateTenantView, 
    TenantByEmailView, VerifyTenantOwnerView
)

urlpatterns = [
    # Authentication endpoints
    path('verify/', VerifyCredentialsView.as_view(), name='verify-credentials'),
    path('verify-session/', VerifySessionView.as_view(), name='verify-session'),
    path('check-attributes/', CheckUserAttributesView.as_view(), name='check-attributes'),
    path('verify-tenant/', VerifyTenantView.as_view(), name='verify-tenant'),
    
    # User management endpoints
    path('signup/', SignUpView.as_view(), name='user-signup'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    
    # Tenant management endpoints  
    path('tenant/<uuid:tenant_id>/', TenantDetailView.as_view(), name='tenant-detail'),
    path('tenant/exists/', TenantExistsView.as_view(), name='tenant-exists'),
    path('tenant/current/', CurrentTenantView.as_view(), name='current-tenant'),
    path('tenant/validate/', ValidateTenantView.as_view(), name='validate-tenant'),
    path('tenant/by-email/<str:email>/', TenantByEmailView.as_view(), name='tenant-by-email'),
    path('tenant/verify-owner/', VerifyTenantOwnerView.as_view(), name='verify-tenant-owner'),
]
`;

fs.writeFileSync(backendUrlsPath, enhancedUrls);
console.log('✅ Updated backend URLs with new user endpoints');

// Step 3: Create enhanced OAuth success page
console.log('\nStep 3: Creating enhanced OAuth success page...');

const oauthSuccessPath = path.join(rootDir, 'frontend/pyfactor_next/src/app/auth/oauth-success/page.js');
backupFile(oauthSuccessPath);

const enhancedOAuthSuccess = `'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { cognitoAuth } from '@/lib/cognitoDirectAuth';
import CognitoAttributes from '@/utils/CognitoAttributes';

export default function OAuthSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing authentication...');
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const completeOAuthFlow = async () => {
      try {
        // Check if user is authenticated with direct OAuth
        if (!cognitoAuth.isAuthenticated()) {
          logger.error('[OAuth Success] No authentication tokens found');
          router.push('/auth/signin?error=' + encodeURIComponent('Authentication failed'));
          return;
        }

        // Get user info from direct OAuth
        const user = cognitoAuth.getCurrentUser();
        if (!user) {
          logger.error('[OAuth Success] No user information found');
          router.push('/auth/signin?error=' + encodeURIComponent('User information not found'));
          return;
        }

        logger.debug('[OAuth Success] User authenticated via direct OAuth:', user.email);

        // Test the new tenant ID extraction function using CognitoAttributes utility
        const userAttributes = cognitoAuth.getCustomAttributes() || {};
        const tenantIdFromAuth = CognitoAttributes.getTenantId(userAttributes);
        
        console.log('[OAuth Success] Tenant ID from CognitoAttributes.getTenantId():', tenantIdFromAuth);
        console.log('[OAuth Success] Custom attributes:', userAttributes);

        setDebugInfo({
          email: user.email,
          tenantId: tenantIdFromAuth,
          attributes: userAttributes,
          hasTokens: true
        });

        setStatus('Creating user account...');

        // First, try to create/verify user account in backend
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dottapps.com';
          const signupResponse = await fetch(\`\${apiUrl}/api/auth/signup\`, {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${localStorage.getItem('idToken')}\`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: user.email,
              cognitoId: user.sub,
              firstName: user.given_name || '',
              lastName: user.family_name || '',
              userRole: 'owner',
              is_already_verified: true
            })
          });

          if (signupResponse.ok) {
            const signupData = await signupResponse.json();
            logger.debug('[OAuth Success] User account created/verified:', signupData);
            
            setStatus('Checking account status...');
            
            // Now get the full user profile
            const profileResponse = await fetch(\`\${apiUrl}/api/auth/profile\`, {
              method: 'GET',
              headers: {
                'Authorization': \`Bearer \${localStorage.getItem('idToken')}\`,
                'Content-Type': 'application/json'
              }
            });

            if (profileResponse.ok) {
              const userProfile = await profileResponse.json();
              logger.debug('[OAuth Success] User profile from API:', userProfile);
              
              // Store user profile in cache
              setCacheValue('user_profile', userProfile, { ttl: 3600000 });
              
              if (typeof window !== 'undefined' && window.__APP_CACHE) {
                window.__APP_CACHE.user = window.__APP_CACHE.user || {};
                window.__APP_CACHE.user.profile = userProfile;
                window.__APP_CACHE.user.email = user.email;
              }

              // Check if user has a tenant ID or needs onboarding
              const tenantId = userProfile.tenant_id || 
                              userProfile.tenantId ||
                              tenantIdFromAuth;
              
              const onboardingStatus = userProfile.onboarding_status || userProfile.onboardingStatus;
              const setupDone = userProfile.setup_done || userProfile.setupDone;

              // Store tenant ID if available
              if (tenantId) {
                if (typeof window !== 'undefined' && window.__APP_CACHE) {
                  window.__APP_CACHE.tenant = window.__APP_CACHE.tenant || {};
                  window.__APP_CACHE.tenant.id = tenantId;
                  window.__APP_CACHE.tenantId = tenantId;
                }
                localStorage.setItem('tenant_id', tenantId);
                setCacheValue('tenantId', tenantId, { ttl: 24 * 60 * 60 * 1000 });
              }

              // Redirect based on onboarding status
              if (onboardingStatus === 'complete' || setupDone) {
                logger.debug('[OAuth Success] User is fully onboarded, redirecting to dashboard');
                setStatus('Redirecting to dashboard...');
                if (tenantId) {
                  router.push(\`/tenant/\${tenantId}/dashboard?fromAuth=true\`);
                } else {
                  router.push('/dashboard?fromAuth=true');
                }
              } else {
                // User needs onboarding - redirect appropriately
                logger.debug('[OAuth Success] User needs onboarding, status:', onboardingStatus);
                setStatus('Setting up your account...');
                
                // For new OAuth users, start with business info
                if (!onboardingStatus || onboardingStatus === 'not_started') {
                  router.push('/onboarding?newUser=true&provider=google');
                } else {
                  // Handle specific onboarding steps
                  switch(onboardingStatus) {
                    case 'business_info':
                    case 'business-info':
                      router.push('/onboarding/subscription');
                      break;
                    case 'subscription':
                      router.push('/onboarding/subscription');
                      break;
                    case 'payment':
                      router.push('/onboarding/setup');
                      break;
                    case 'setup':
                      router.push('/onboarding/setup');
                      break;
                    default:
                      router.push('/onboarding');
                  }
                }
              }

            } else {
              // Profile fetch failed, but user was created - proceed with limited info
              logger.warn('[OAuth Success] Profile fetch failed but user exists, proceeding with onboarding');
              setStatus('Setting up your account...');
              router.push('/onboarding?newUser=true&provider=google');
            }

          } else {
            // Signup failed - check if user already exists
            const signupError = await signupResponse.text();
            logger.warn('[OAuth Success] Signup failed:', signupError);
            
            // Try to get user profile directly (user might exist)
            const profileResponse = await fetch(\`\${apiUrl}/api/auth/profile\`, {
              method: 'GET',
              headers: {
                'Authorization': \`Bearer \${localStorage.getItem('idToken')}\`,
                'Content-Type': 'application/json'
              }
            });

            if (profileResponse.ok) {
              const userProfile = await profileResponse.json();
              logger.debug('[OAuth Success] Existing user profile found:', userProfile);
              
              // Handle existing user flow (same
