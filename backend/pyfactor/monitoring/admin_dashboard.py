"""
Admin Monitoring Dashboard
Real-time monitoring and analytics for system administrators
"""

from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q, F
from django.core.cache import cache
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
import psutil
import redis
import logging

logger = logging.getLogger(__name__)


class SystemMonitor:
    """System monitoring utilities"""
    
    @staticmethod
    def get_system_metrics():
        """Get current system metrics"""
        try:
            return {
                'cpu': {
                    'usage_percent': psutil.cpu_percent(interval=1),
                    'core_count': psutil.cpu_count(),
                    'frequency': psutil.cpu_freq().current if psutil.cpu_freq() else 0
                },
                'memory': {
                    'total': psutil.virtual_memory().total,
                    'available': psutil.virtual_memory().available,
                    'percent': psutil.virtual_memory().percent,
                    'used': psutil.virtual_memory().used
                },
                'disk': {
                    'total': psutil.disk_usage('/').total,
                    'used': psutil.disk_usage('/').used,
                    'free': psutil.disk_usage('/').free,
                    'percent': psutil.disk_usage('/').percent
                },
                'network': {
                    'bytes_sent': psutil.net_io_counters().bytes_sent,
                    'bytes_recv': psutil.net_io_counters().bytes_recv,
                    'packets_sent': psutil.net_io_counters().packets_sent,
                    'packets_recv': psutil.net_io_counters().packets_recv
                }
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {}
    
    @staticmethod
    def get_database_metrics():
        """Get database performance metrics"""
        from django.db import connection
        
        try:
            with connection.cursor() as cursor:
                # Get database size
                cursor.execute("""
                    SELECT pg_database_size(current_database()) as size,
                           (SELECT count(*) FROM pg_stat_activity) as connections,
                           (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries
                """)
                result = cursor.fetchone()
                
                # Get slow queries
                cursor.execute("""
                    SELECT query, calls, mean_exec_time, max_exec_time
                    FROM pg_stat_statements
                    WHERE mean_exec_time > 100
                    ORDER BY mean_exec_time DESC
                    LIMIT 10
                """)
                slow_queries = cursor.fetchall() if cursor.description else []
                
                return {
                    'size': result[0] if result else 0,
                    'connections': result[1] if result else 0,
                    'active_queries': result[2] if result else 0,
                    'slow_queries': [
                        {
                            'query': q[0][:100],  # Truncate query
                            'calls': q[1],
                            'mean_time': q[2],
                            'max_time': q[3]
                        } for q in slow_queries
                    ]
                }
        except Exception as e:
            logger.error(f"Error getting database metrics: {e}")
            return {
                'size': 0,
                'connections': 0,
                'active_queries': 0,
                'slow_queries': []
            }
    
    @staticmethod
    def get_redis_metrics():
        """Get Redis cache metrics"""
        try:
            from django.conf import settings
            import redis
            
            r = redis.from_url(settings.REDIS_URL)
            info = r.info()
            
            return {
                'used_memory': info.get('used_memory', 0),
                'used_memory_human': info.get('used_memory_human', '0'),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'hit_rate': round(
                    info.get('keyspace_hits', 0) / 
                    max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1) * 100, 
                    2
                )
            }
        except Exception as e:
            logger.error(f"Error getting Redis metrics: {e}")
            return {}


class ApplicationMonitor:
    """Application-specific monitoring"""
    
    @staticmethod
    def get_user_metrics():
        """Get user activity metrics"""
        from django.contrib.auth import get_user_model
        from session_manager.models import UserSession
        
        User = get_user_model()
        now = timezone.now()
        
        return {
            'total_users': User.objects.count(),
            'active_today': User.objects.filter(
                last_login__gte=now - timedelta(days=1)
            ).count(),
            'active_week': User.objects.filter(
                last_login__gte=now - timedelta(days=7)
            ).count(),
            'active_month': User.objects.filter(
                last_login__gte=now - timedelta(days=30)
            ).count(),
            'active_sessions': UserSession.objects.filter(
                is_active=True,
                expires_at__gt=now
            ).count(),
            'new_users_today': User.objects.filter(
                date_joined__gte=now - timedelta(days=1)
            ).count(),
            'new_users_week': User.objects.filter(
                date_joined__gte=now - timedelta(days=7)
            ).count()
        }
    
    @staticmethod
    def get_business_metrics():
        """Get business performance metrics"""
        from sales.models import Invoice, Payment
        from users.models import Subscription
        
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0)
        
        return {
            'revenue': {
                'today': float(Payment.objects.filter(
                    created_at__gte=now - timedelta(days=1),
                    status='completed'
                ).aggregate(Sum('amount'))['amount__sum'] or 0),
                'month': float(Payment.objects.filter(
                    created_at__gte=month_start,
                    status='completed'
                ).aggregate(Sum('amount'))['amount__sum'] or 0),
                'year': float(Payment.objects.filter(
                    created_at__year=now.year,
                    status='completed'
                ).aggregate(Sum('amount'))['amount__sum'] or 0)
            },
            'subscriptions': {
                'active': Subscription.objects.filter(
                    status__in=['active', 'trialing']
                ).count(),
                'free': Subscription.objects.filter(
                    plan_name='free'
                ).count(),
                'professional': Subscription.objects.filter(
                    plan_name='professional'
                ).count(),
                'enterprise': Subscription.objects.filter(
                    plan_name='enterprise'
                ).count()
            },
            'invoices': {
                'total': Invoice.objects.count(),
                'paid': Invoice.objects.filter(status='paid').count(),
                'pending': Invoice.objects.filter(status='pending').count(),
                'overdue': Invoice.objects.filter(
                    status='pending',
                    due_date__lt=now
                ).count()
            }
        }
    
    @staticmethod
    def get_api_metrics():
        """Get API usage metrics"""
        # Get from cache (populated by rate limiter)
        return {
            'requests_today': cache.get('api_requests_today', 0),
            'requests_hour': cache.get('api_requests_hour', 0),
            'average_response_time': cache.get('api_avg_response_time', 0),
            'error_rate': cache.get('api_error_rate', 0),
            'rate_limit_hits': cache.get('rate_limit_hits', 0),
            'top_endpoints': cache.get('top_endpoints', []),
            'top_users': cache.get('top_api_users', [])
        }
    
    @staticmethod
    def get_error_metrics():
        """Get error tracking metrics"""
        from audit.models import ErrorLog
        
        now = timezone.now()
        
        return {
            'errors_today': ErrorLog.objects.filter(
                created_at__gte=now - timedelta(days=1)
            ).count(),
            'errors_week': ErrorLog.objects.filter(
                created_at__gte=now - timedelta(days=7)
            ).count(),
            'critical_errors': ErrorLog.objects.filter(
                created_at__gte=now - timedelta(days=1),
                level='CRITICAL'
            ).count(),
            'top_errors': list(ErrorLog.objects.filter(
                created_at__gte=now - timedelta(days=1)
            ).values('error_type').annotate(
                count=Count('id')
            ).order_by('-count')[:5])
        }


@staff_member_required
def admin_monitoring_dashboard(request):
    """Main admin monitoring dashboard view"""
    
    context = {
        'system_metrics': SystemMonitor.get_system_metrics(),
        'database_metrics': SystemMonitor.get_database_metrics(),
        'redis_metrics': SystemMonitor.get_redis_metrics(),
        'user_metrics': ApplicationMonitor.get_user_metrics(),
        'business_metrics': ApplicationMonitor.get_business_metrics(),
        'api_metrics': ApplicationMonitor.get_api_metrics(),
        'error_metrics': ApplicationMonitor.get_error_metrics(),
        'timestamp': timezone.now()
    }
    
    return render(request, 'admin/monitoring_dashboard.html', context)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def api_monitoring_metrics(request):
    """API endpoint for real-time monitoring data"""
    
    metric_type = request.GET.get('type', 'all')
    
    if metric_type == 'system':
        data = SystemMonitor.get_system_metrics()
    elif metric_type == 'database':
        data = SystemMonitor.get_database_metrics()
    elif metric_type == 'redis':
        data = SystemMonitor.get_redis_metrics()
    elif metric_type == 'users':
        data = ApplicationMonitor.get_user_metrics()
    elif metric_type == 'business':
        data = ApplicationMonitor.get_business_metrics()
    elif metric_type == 'api':
        data = ApplicationMonitor.get_api_metrics()
    elif metric_type == 'errors':
        data = ApplicationMonitor.get_error_metrics()
    else:
        data = {
            'system': SystemMonitor.get_system_metrics(),
            'database': SystemMonitor.get_database_metrics(),
            'redis': SystemMonitor.get_redis_metrics(),
            'users': ApplicationMonitor.get_user_metrics(),
            'business': ApplicationMonitor.get_business_metrics(),
            'api': ApplicationMonitor.get_api_metrics(),
            'errors': ApplicationMonitor.get_error_metrics()
        }
    
    return Response({
        'success': True,
        'data': data,
        'timestamp': timezone.now()
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def api_monitoring_health(request):
    """Health check endpoint with detailed status"""
    
    health_checks = {
        'database': False,
        'redis': False,
        'disk_space': False,
        'memory': False
    }
    
    issues = []
    
    # Check database
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_checks['database'] = True
    except Exception as e:
        issues.append(f"Database connection failed: {e}")
    
    # Check Redis
    try:
        cache.set('health_check', 'ok', 1)
        if cache.get('health_check') == 'ok':
            health_checks['redis'] = True
    except Exception as e:
        issues.append(f"Redis connection failed: {e}")
    
    # Check disk space
    disk_usage = psutil.disk_usage('/')
    if disk_usage.percent < 90:
        health_checks['disk_space'] = True
    else:
        issues.append(f"Low disk space: {disk_usage.percent}% used")
    
    # Check memory
    memory = psutil.virtual_memory()
    if memory.percent < 90:
        health_checks['memory'] = True
    else:
        issues.append(f"High memory usage: {memory.percent}%")
    
    overall_health = all(health_checks.values())
    
    return Response({
        'healthy': overall_health,
        'checks': health_checks,
        'issues': issues,
        'timestamp': timezone.now()
    })