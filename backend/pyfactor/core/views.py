"""
Core module views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.cache import cache
from .performance_monitor import get_performance_dashboard
from .cache_service import cache_service
from .rate_limiter import rate_limit
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@rate_limit('minute')
def performance_dashboard(request):
    """Get performance metrics dashboard"""
    try:
        # Check if user is admin/owner
        user_role = getattr(request.user, 'role', 'USER')
        if user_role not in ['OWNER', 'ADMIN']:
            return Response({
                'error': 'Unauthorized. Performance metrics are only available to administrators.'
            }, status=403)
        
        metrics = get_performance_dashboard()
        
        return Response({
            'success': True,
            'metrics': metrics
        })
    
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to retrieve performance metrics'
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@rate_limit('minute')
def cache_status(request):
    """Get cache status and statistics"""
    try:
        # Check if user is admin/owner
        user_role = getattr(request.user, 'role', 'USER')
        if user_role not in ['OWNER', 'ADMIN']:
            return Response({
                'error': 'Unauthorized. Cache status is only available to administrators.'
            }, status=403)
        
        # Get cache backend info
        cache_backend = cache._cache.__class__.__name__
        
        # Try to get Redis info if using Redis
        redis_info = {}
        if 'Redis' in cache_backend:
            try:
                client = cache._cache.get_client()
                info = client.info()
                redis_info = {
                    'version': info.get('redis_version'),
                    'used_memory': info.get('used_memory_human'),
                    'connected_clients': info.get('connected_clients'),
                    'total_commands': info.get('total_commands_processed'),
                    'keyspace': info.get('db0', {})
                }
            except Exception as e:
                logger.warning(f"Could not get Redis info: {str(e)}")
        
        # Get cache statistics
        stats = {
            'backend': cache_backend,
            'redis': redis_info,
            'keys': {
                'user_profiles': cache.get('cache_count_user', 0),
                'business_details': cache.get('cache_count_business', 0),
                'currency_preferences': cache.get('cache_count_currency', 0),
                'api_responses': cache.get('cache_count_api', 0),
            },
            'hit_rate': {
                'overall': cache.get('cache_hit_rate', 0),
                'user_profiles': cache.get('cache_hit_rate_user', 0),
                'business_details': cache.get('cache_hit_rate_business', 0),
                'currency_preferences': cache.get('cache_hit_rate_currency', 0),
            }
        }
        
        return Response({
            'success': True,
            'cache_status': stats
        })
    
    except Exception as e:
        logger.error(f"Error getting cache status: {str(e)}")
        return Response({
            'success': False,
            'error': 'Failed to retrieve cache status'
        }, status=500)