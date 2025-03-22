import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.shortcuts import get_object_or_404
from custom_auth.models import Tenant
from django.utils import timezone

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
                        'correctSchemaName': existing_tenant.schema_name
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
                            'correctSchemaName': existing_tenant.schema_name
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
                        'schemaName': tenant.schema_name
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
                        'correctSchemaName': existing_tenant.schema_name
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
