# Auth0 Views for User Management and Onboarding
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from .models_auth0 import Auth0User, Tenant, UserTenantRole, OnboardingProgress
from .serializers_auth0 import (
    UserProfileSerializer, BusinessInfoSerializer, 
    SubscriptionSerializer, TenantSerializer,
    OnboardingProgressSerializer
)
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """Get or create user profile from Auth0 authentication"""
    try:
        # Get Auth0 user info from request (added by Auth0 middleware)
        auth0_user = request.auth0_user
        
        # Get or create user in our database
        user, created = Auth0User.objects.get_or_create(
            auth0_id=auth0_user['sub'],
            defaults={
                'email': auth0_user.get('email', ''),
                'name': auth0_user.get('name', ''),
                'picture': auth0_user.get('picture', ''),
            }
        )
        
        if not created:
            # Update last login
            user.last_login = timezone.now()
            user.save()
        
        # Prepare response data
        response_data = {
            'user': {
                'id': user.id,
                'auth0_id': user.auth0_id,
                'email': user.email,
                'name': user.name,
                'picture': user.picture,
            }
        }
        
        # Add tenant info if user has one
        if user.current_tenant:
            tenant = user.current_tenant
            role = UserTenantRole.objects.filter(
                user=user, tenant=tenant
            ).first()
            
            response_data['tenant'] = TenantSerializer(tenant).data
            response_data['role'] = role.role if role else 'user'
            
            # Add onboarding progress
            progress = OnboardingProgress.objects.filter(
                user=user, tenant=tenant
            ).first()
            if progress:
                response_data['onboarding'] = OnboardingProgressSerializer(progress).data
        else:
            response_data['tenant'] = None
            response_data['role'] = None
            response_data['onboarding'] = None
            response_data['needs_onboarding'] = True
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        return Response(
            {'error': 'Failed to get user profile'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_business_info(request):
    """Submit business information during onboarding"""
    serializer = BusinessInfoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            # Get user
            auth0_user = request.auth0_user
            user = Auth0User.objects.get(auth0_id=auth0_user['sub'])
            
            # Create tenant with all business information
            tenant = Tenant.objects.create(
                name=serializer.validated_data['business_name'],
                business_type=serializer.validated_data['business_type'],
                business_subtypes=serializer.validated_data.get('business_subtypes', {}),
                country=serializer.validated_data['country'],
                business_state=serializer.validated_data.get('business_state', ''),
                legal_structure=serializer.validated_data['legal_structure'],
                date_founded=serializer.validated_data['date_founded'],
                owner_first_name=serializer.validated_data['first_name'],
                owner_last_name=serializer.validated_data['last_name'],
                industry=serializer.validated_data.get('industry', serializer.validated_data['business_type']),
                address=serializer.validated_data.get('address', ''),
                phone_number=serializer.validated_data.get('phone_number', ''),
                tax_id=serializer.validated_data.get('tax_id', ''),
                onboarding_step='subscription'
            )
            
            # Create user-tenant relationship as owner
            UserTenantRole.objects.create(
                user=user,
                tenant=tenant,
                role='owner'
            )
            
            # Set as current tenant
            user.current_tenant = tenant
            user.save()
            
            # Create onboarding progress
            progress, created = OnboardingProgress.objects.get_or_create(
                user=user,
                tenant=tenant
            )
            progress.business_info_completed = True
            progress.save()
            
            return Response({
                'success': True,
                'tenant_id': str(tenant.id),
                'next_step': 'subscription'
            })
            
    except Exception as e:
        logger.error(f"Error submitting business info: {str(e)}")
        return Response(
            {'error': 'Failed to save business information'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_subscription(request):
    """Submit subscription selection during onboarding"""
    serializer = SubscriptionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get user and tenant
        auth0_user = request.auth0_user
        user = Auth0User.objects.get(auth0_id=auth0_user['sub'])
        tenant = user.current_tenant
        
        if not tenant:
            return Response(
                {'error': 'No tenant found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update tenant subscription
        tenant.subscription_plan = serializer.validated_data['plan']
        tenant.billing_interval = serializer.validated_data['billing_interval']
        tenant.subscription_date = timezone.now()
        tenant.subscription_status = 'active' if tenant.subscription_plan == 'free' else 'pending'
        tenant.onboarding_step = 'payment' if tenant.subscription_plan != 'free' else 'setup'
        
        # Set configuration flags for free plan
        if tenant.subscription_plan == 'free':
            tenant.setup_freeplan = True
            
        tenant.save()
        
        # Update onboarding progress
        progress = OnboardingProgress.objects.get(user=user, tenant=tenant)
        progress.subscription_selected = True
        progress.save()
        
        return Response({
            'success': True,
            'next_step': tenant.onboarding_step,
            'requires_payment': tenant.subscription_plan != 'free'
        })
        
    except Exception as e:
        logger.error(f"Error submitting subscription: {str(e)}")
        return Response(
            {'error': 'Failed to save subscription'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_onboarding(request):
    """Complete the onboarding process"""
    try:
        # Get user and tenant
        auth0_user = request.auth0_user
        user = Auth0User.objects.get(auth0_id=auth0_user['sub'])
        tenant = user.current_tenant
        
        if not tenant:
            return Response(
                {'error': 'No tenant found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update tenant
        tenant.onboarding_completed = True
        tenant.onboarding_step = 'completed'
        tenant.save()
        
        # Update onboarding progress
        progress = OnboardingProgress.objects.get(user=user, tenant=tenant)
        progress.setup_completed = True
        progress.completed_at = timezone.now()
        progress.save()
        
        # Create schema for tenant (you'll need to implement this)
        # create_tenant_schema(tenant.schema_name)
        
        return Response({
            'success': True,
            'tenant_id': str(tenant.id),
            'dashboard_url': f'/tenant/{tenant.id}/dashboard'
        })
        
    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}")
        return Response(
            {'error': 'Failed to complete onboarding'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_onboarding_status(request):
    """Get current onboarding status"""
    try:
        auth0_user = request.auth0_user
        user = Auth0User.objects.get(auth0_id=auth0_user['sub'])
        
        if not user.current_tenant:
            return Response({
                'status': 'not_started',
                'next_step': 'business_info'
            })
        
        tenant = user.current_tenant
        progress = OnboardingProgress.objects.filter(
            user=user, tenant=tenant
        ).first()
        
        return Response({
            'status': 'completed' if tenant.onboarding_completed else 'in_progress',
            'current_step': tenant.onboarding_step,
            'progress': OnboardingProgressSerializer(progress).data if progress else None,
            'tenant_id': str(tenant.id)
        })
        
    except Auth0User.DoesNotExist:
        return Response({
            'status': 'not_started',
            'next_step': 'business_info'
        })
    except Exception as e:
        logger.error(f"Error getting onboarding status: {str(e)}")
        return Response(
            {'error': 'Failed to get onboarding status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )