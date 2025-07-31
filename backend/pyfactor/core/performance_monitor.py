"""
Performance monitoring utilities
"""
import time
import functools
import logging
from typing import Optional, Dict, Any
from django.core.cache import cache
from django.db import connection
from django.conf import settings
import json

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """
    Monitor and log API performance metrics
    """
    
    def __init__(self, metric_prefix: str = "perf"):
        self.metric_prefix = metric_prefix
    
    def record_metric(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None):
        """Record a performance metric"""
        key = f"{self.metric_prefix}:{metric_name}"
        
        # Add to rolling window in cache
        current_minute = int(time.time() / 60)
        window_key = f"{key}:{current_minute}"
        
        try:
            # Get current window data
            window_data = cache.get(window_key, {
                'count': 0,
                'sum': 0,
                'min': float('inf'),
                'max': float('-inf'),
                'values': []
            })
            
            # Update statistics
            window_data['count'] += 1
            window_data['sum'] += value
            window_data['min'] = min(window_data['min'], value)
            window_data['max'] = max(window_data['max'], value)
            
            # Keep last 100 values for percentile calculations
            if len(window_data['values']) < 100:
                window_data['values'].append(value)
            
            # Cache for 5 minutes
            cache.set(window_key, window_data, 300)
            
            # Log slow operations
            if metric_name == 'response_time' and value > 1.0:
                logger.warning(f"Slow operation detected: {metric_name} took {value:.3f}s", extra={
                    'metric': metric_name,
                    'value': value,
                    'tags': tags
                })
        
        except Exception as e:
            logger.error(f"Error recording metric: {str(e)}")
    
    def get_metrics_summary(self, metric_name: str, minutes: int = 5) -> Dict[str, Any]:
        """Get summary of metrics for the last N minutes"""
        key = f"{self.metric_prefix}:{metric_name}"
        current_minute = int(time.time() / 60)
        
        all_data = {
            'count': 0,
            'sum': 0,
            'min': float('inf'),
            'max': float('-inf'),
            'values': []
        }
        
        # Aggregate data from multiple windows
        for i in range(minutes):
            window_key = f"{key}:{current_minute - i}"
            window_data = cache.get(window_key)
            
            if window_data:
                all_data['count'] += window_data['count']
                all_data['sum'] += window_data['sum']
                all_data['min'] = min(all_data['min'], window_data['min'])
                all_data['max'] = max(all_data['max'], window_data['max'])
                all_data['values'].extend(window_data.get('values', []))
        
        if all_data['count'] == 0:
            return {
                'count': 0,
                'average': 0,
                'min': 0,
                'max': 0,
                'p50': 0,
                'p95': 0,
                'p99': 0
            }
        
        # Calculate percentiles if we have values
        percentiles = {}
        if all_data['values']:
            sorted_values = sorted(all_data['values'])
            count = len(sorted_values)
            percentiles = {
                'p50': sorted_values[int(count * 0.5)],
                'p95': sorted_values[int(count * 0.95)],
                'p99': sorted_values[int(count * 0.99)] if count > 100 else sorted_values[-1]
            }
        
        return {
            'count': all_data['count'],
            'average': all_data['sum'] / all_data['count'],
            'min': all_data['min'],
            'max': all_data['max'],
            **percentiles
        }


# Global performance monitor instance
perf_monitor = PerformanceMonitor()


def monitor_performance(metric_name: Optional[str] = None):
    """
    Decorator to monitor function performance
    
    Usage:
        @monitor_performance('api_call')
        def my_function():
            ...
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            query_count_before = len(connection.queries)
            
            try:
                result = func(*args, **kwargs)
                
                # Record metrics
                duration = time.time() - start_time
                query_count = len(connection.queries) - query_count_before
                
                # Use function name as metric if not provided
                name = metric_name or f"{func.__module__}.{func.__name__}"
                
                # Record response time
                perf_monitor.record_metric(f"{name}_time", duration)
                
                # Record query count
                if query_count > 0:
                    perf_monitor.record_metric(f"{name}_queries", query_count)
                
                # Log if slow
                if duration > 1.0:
                    logger.warning(
                        f"Slow function: {name} took {duration:.3f}s with {query_count} queries"
                    )
                
                return result
            
            except Exception as e:
                # Record error
                duration = time.time() - start_time
                name = metric_name or f"{func.__module__}.{func.__name__}"
                perf_monitor.record_metric(f"{name}_errors", 1)
                
                logger.error(
                    f"Function error: {name} failed after {duration:.3f}s",
                    exc_info=True
                )
                raise
        
        return wrapper
    return decorator


def monitor_view_performance(view_func):
    """
    Decorator specifically for Django views with more detailed monitoring
    """
    @functools.wraps(view_func)
    def wrapper(request, *args, **kwargs):
        start_time = time.time()
        query_count_before = len(connection.queries)
        
        # Extract request info
        endpoint = request.path
        method = request.method
        user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'
        
        try:
            response = view_func(request, *args, **kwargs)
            
            # Record metrics
            duration = time.time() - start_time
            query_count = len(connection.queries) - query_count_before
            status_code = getattr(response, 'status_code', 200)
            
            # Record detailed metrics
            perf_monitor.record_metric('response_time', duration, {
                'endpoint': endpoint,
                'method': method,
                'status': str(status_code)
            })
            
            perf_monitor.record_metric('query_count', query_count, {
                'endpoint': endpoint,
                'method': method
            })
            
            # Add performance headers
            if hasattr(response, '__setitem__'):
                response['X-Response-Time'] = f"{duration:.3f}"
                response['X-Query-Count'] = str(query_count)
            
            # Log slow requests
            if duration > 1.0:
                slow_queries = [
                    q for q in connection.queries[query_count_before:]
                    if float(q['time']) > 0.1
                ]
                
                logger.warning(
                    f"Slow request: {method} {endpoint} took {duration:.3f}s",
                    extra={
                        'duration': duration,
                        'query_count': query_count,
                        'slow_queries': len(slow_queries),
                        'user_id': user_id,
                        'status_code': status_code
                    }
                )
            
            return response
        
        except Exception as e:
            # Record error metrics
            duration = time.time() - start_time
            
            perf_monitor.record_metric('response_errors', 1, {
                'endpoint': endpoint,
                'method': method,
                'error': type(e).__name__
            })
            
            logger.error(
                f"Request error: {method} {endpoint} failed after {duration:.3f}s",
                exc_info=True,
                extra={
                    'duration': duration,
                    'user_id': user_id
                }
            )
            raise
    
    return wrapper


# API endpoint for performance metrics
def get_performance_dashboard():
    """Get performance metrics dashboard data"""
    metrics = {}
    
    # Get response time metrics
    for window in [1, 5, 15]:
        metrics[f'response_time_{window}m'] = perf_monitor.get_metrics_summary('response_time', window)
    
    # Get query count metrics
    for window in [1, 5, 15]:
        metrics[f'query_count_{window}m'] = perf_monitor.get_metrics_summary('query_count', window)
    
    # Get error rate
    for window in [1, 5, 15]:
        error_data = perf_monitor.get_metrics_summary('response_errors', window)
        total_data = perf_monitor.get_metrics_summary('response_time', window)
        
        if total_data['count'] > 0:
            error_rate = (error_data['count'] / total_data['count']) * 100
        else:
            error_rate = 0
        
        metrics[f'error_rate_{window}m'] = {
            'rate': error_rate,
            'errors': error_data['count'],
            'total': total_data['count']
        }
    
    # Get cache hit rate
    cache_hits = cache.get('cache_hits', 0)
    cache_misses = cache.get('cache_misses', 0)
    cache_total = cache_hits + cache_misses
    
    if cache_total > 0:
        cache_hit_rate = (cache_hits / cache_total) * 100
    else:
        cache_hit_rate = 0
    
    metrics['cache'] = {
        'hit_rate': cache_hit_rate,
        'hits': cache_hits,
        'misses': cache_misses,
        'total': cache_total
    }
    
    return metrics