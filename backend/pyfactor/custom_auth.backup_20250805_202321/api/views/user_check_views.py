"""
Simple User Check API Views for debugging
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from custom_auth.models import Tenant
from django.db import connection

logger = logging.getLogger(__name__)
User = get_user_model()

class CheckUserView(APIView):
    """
    Simple endpoint to check if a user exists by email
    Endpoint: GET /api/check-user/?email=<email>
    """
    permission_classes = [AllowAny]  # Temporary for debugging
    
    def get(self, request):
        email = request.GET.get('email')
        
        if not email:
            return Response({
                'error': 'Email parameter required',
                'usage': '/api/check-user/?email=example@gmail.com'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Check using Django ORM
            users = User.objects.filter(email=email)
            
            result = {
                'email': email,
                'exists': users.exists(),
                'count': users.count(),
                'users': []
            }
            
            if users.exists():
                for user in users:
                    user_data = {
                        'user_id': str(user.id),
                        'email': user.email,
                        'is_active': user.is_active,
                        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                        'auth0_sub': getattr(user, 'auth0_sub', None),
                        'tenant_id': str(getattr(user, 'tenant_id', None)) if getattr(user, 'tenant_id', None) else None,
                    }
                    
                    # Get tenant info if available
                    if hasattr(user, 'tenant_id') and user.tenant_id:
                        try:
                            tenant = Tenant.objects.get(id=user.tenant_id)
                            user_data['tenant_info'] = {
                                'tenant_id': str(tenant.id),
                                'name': tenant.name,
                                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
                                'owner_id': str(getattr(tenant, 'owner_id', None)) if getattr(tenant, 'owner_id', None) else None
                            }
                        except Tenant.DoesNotExist:
                            user_data['tenant_info'] = None
                    
                    # Check if user owns any tenants
                    owned_tenants = Tenant.objects.filter(owner_id=user.id)
                    user_data['owned_tenants'] = [
                        {
                            'tenant_id': str(t.id),
                            'name': t.name,
                            'created_at': t.created_at.isoformat() if t.created_at else None
                        }
                        for t in owned_tenants
                    ]
                    
                    result['users'].append(user_data)
            
            # Also check with raw SQL for comprehensive search
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT u.id, u.email, u.tenant_id, u.is_active, u.date_joined,
                           t.name as tenant_name, t.created_at as tenant_created
                    FROM custom_auth_user u
                    LEFT JOIN custom_auth_tenant t ON u.tenant_id = t.id
                    WHERE u.email = %s
                    ORDER BY u.date_joined
                """, [email])
                
                raw_results = []
                for row in cursor.fetchall():
                    user_id, email_db, tenant_id, is_active, date_joined, tenant_name, tenant_created = row
                    raw_results.append({
                        'user_id': str(user_id),
                        'email': email_db,
                        'tenant_id': str(tenant_id) if tenant_id else None,
                        'tenant_name': tenant_name,
                        'is_active': is_active,
                        'date_joined': date_joined.isoformat() if date_joined else None,
                        'tenant_created': tenant_created.isoformat() if tenant_created else None
                    })
                
                result['raw_sql_results'] = raw_results
            
            return Response(result)
            
        except Exception as e:
            logger.error(f"Error checking user {email}: {str(e)}")
            return Response({
                'error': f'Database error: {str(e)}',
                'email': email
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 