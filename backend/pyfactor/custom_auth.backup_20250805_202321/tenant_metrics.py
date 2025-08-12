"""
Tenant Metrics Collector

This module provides:
1. Collection of tenant-specific usage metrics
2. Identification of problematic tenants
3. Monitoring of tenant resource usage
4. Insights for capacity planning
"""
import logging
import time
import threading
from collections import defaultdict
from django.core.cache import cache
from django.conf import settings
from custom_auth.tenant_metadata import TenantMetadataService

logger = logging.getLogger(__name__)

# Thread-local storage
_thread_local = threading.local()

# Metrics storage
_tenant_metrics = defaultdict(lambda: {
    'queries': 0,
    'mutations': 0,
    'query_time': 0,
    'row_count': 0,
    'errors': 0,
    'last_activity': time.time(),
})

# Lock for thread-safe access to metrics
_metrics_lock = threading.Lock()

# Cache keys
TENANT_METRICS_CACHE_KEY = 'tenant_metrics:{}'
TENANT_METRICS_SUMMARY_KEY = 'tenant_metrics_summary'

# Cache timeouts
TENANT_METRICS_CACHE_TIMEOUT = 86400  # 24 hours


class TenantMetricsCollector:
    """
    Collector for tenant-specific usage metrics.
    """
    
    @staticmethod
    def record_query(tenant_id=None, query_type='read', execution_time=0, row_count=0):
        """
        Record a database query.
        
        Args:
            tenant_id: UUID of the tenant
            query_type: Type of query ('read' or 'write')
            execution_time: Execution time in seconds
            row_count: Number of rows returned or affected
        """
        # Get tenant ID from thread-local if not provided
        if not tenant_id:
            tenant_id = TenantMetadataService.get_current_tenant_id()
        
        if not tenant_id:
            return
        
        tenant_id_str = str(tenant_id)
        
        with _metrics_lock:
            metrics = _tenant_metrics[tenant_id_str]
            
            # Update metrics
            if query_type == 'write':
                metrics['mutations'] += 1
            else:
                metrics['queries'] += 1
            
            metrics['query_time'] += execution_time
            metrics['row_count'] += row_count
            metrics['last_activity'] = time.time()
        
        # Record in tenant metadata service
        TenantMetadataService.record_tenant_metrics(tenant_id, {
            'queries': metrics['queries'],
            'mutations': metrics['mutations'],
            'avg_query_time': metrics['query_time'] / (metrics['queries'] + metrics['mutations']) if (metrics['queries'] + metrics['mutations']) > 0 else 0,
            'total_rows': metrics['row_count'],
        })
    
    @staticmethod
    def record_error(tenant_id=None, error_type=None):
        """
        Record an error.
        
        Args:
            tenant_id: UUID of the tenant
            error_type: Type of error
        """
        # Get tenant ID from thread-local if not provided
        if not tenant_id:
            tenant_id = TenantMetadataService.get_current_tenant_id()
        
        if not tenant_id:
            return
        
        tenant_id_str = str(tenant_id)
        
        with _metrics_lock:
            metrics = _tenant_metrics[tenant_id_str]
            
            # Update metrics
            metrics['errors'] += 1
            metrics['last_activity'] = time.time()
        
        # Record in tenant metadata service
        TenantMetadataService.record_tenant_metrics(tenant_id, {
            'errors': metrics['errors'],
        })
    
    @staticmethod
    def get_tenant_metrics(tenant_id):
        """
        Get metrics for a tenant.
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            dict: Tenant metrics
        """
        if not tenant_id:
            return {}
        
        tenant_id_str = str(tenant_id)
        
        # Get metrics from thread-local storage
        with _metrics_lock:
            metrics = _tenant_metrics.get(tenant_id_str, {})
        
        # Get additional metrics from tenant metadata service
        additional_metrics = TenantMetadataService.get_tenant_metrics(tenant_id)
        
        # Combine metrics
        combined_metrics = {
            **metrics,
            **additional_metrics,
        }
        
        return combined_metrics
    
    @staticmethod
    def get_all_tenant_metrics():
        """
        Get metrics for all tenants.
        
        Returns:
            dict: Tenant metrics by tenant ID
        """
        # Try to get from cache first
        all_metrics = cache.get(TENANT_METRICS_SUMMARY_KEY)
        if all_metrics:
            return all_metrics
        
        # Get all tenants
        tenants = TenantMetadataService.get_all_tenants()
        
        # Get metrics for each tenant
        all_metrics = {}
        for tenant in tenants:
            tenant_id = tenant['id']
            metrics = TenantMetricsCollector.get_tenant_metrics(tenant_id)
            all_metrics[tenant_id] = {
                **tenant,
                'metrics': metrics,
            }
        
        # Store in cache
        cache.set(TENANT_METRICS_SUMMARY_KEY, all_metrics, TENANT_METRICS_CACHE_TIMEOUT)
        
        return all_metrics
    
    @staticmethod
    def identify_problematic_tenants(threshold=0.9):
        """
        Identify tenants that are using excessive resources.
        
        Args:
            threshold: Threshold for identifying problematic tenants (0.0-1.0)
            
        Returns:
            list: List of problematic tenant IDs
        """
        all_metrics = TenantMetricsCollector.get_all_tenant_metrics()
        
        # Calculate total usage
        total_queries = sum(tenant.get('metrics', {}).get('queries', 0) for tenant in all_metrics.values())
        total_mutations = sum(tenant.get('metrics', {}).get('mutations', 0) for tenant in all_metrics.values())
        total_query_time = sum(tenant.get('metrics', {}).get('query_time', 0) for tenant in all_metrics.values())
        total_row_count = sum(tenant.get('metrics', {}).get('row_count', 0) for tenant in all_metrics.values())
        
        # Identify problematic tenants
        problematic_tenants = []
        for tenant_id, tenant in all_metrics.items():
            metrics = tenant.get('metrics', {})
            
            # Calculate tenant's share of resources
            query_share = metrics.get('queries', 0) / total_queries if total_queries > 0 else 0
            mutation_share = metrics.get('mutations', 0) / total_mutations if total_mutations > 0 else 0
            query_time_share = metrics.get('query_time', 0) / total_query_time if total_query_time > 0 else 0
            row_count_share = metrics.get('row_count', 0) / total_row_count if total_row_count > 0 else 0
            
            # Calculate overall resource share
            resource_share = (query_share + mutation_share + query_time_share + row_count_share) / 4
            
            # Check if tenant is problematic
            if resource_share > threshold:
                problematic_tenants.append({
                    'tenant_id': tenant_id,
                    'resource_share': resource_share,
                    'metrics': metrics,
                })
        
        return problematic_tenants
    
    @staticmethod
    def reset_metrics():
        """
        Reset all metrics.
        """
        with _metrics_lock:
            _tenant_metrics.clear()
        
        # Clear cache
        cache.delete(TENANT_METRICS_SUMMARY_KEY)
        
        logger.info("Tenant metrics reset")


class QueryMetricsMiddleware:
    """
    Middleware that collects query metrics for each request.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get tenant ID from request
        tenant_id = request.headers.get('X-Tenant-ID')
        if not tenant_id and hasattr(request, 'user') and hasattr(request.user, 'tenant_id'):
            tenant_id = request.user.tenant_id
        
        # Determine query type based on request method
        query_type = 'write' if request.method in ('POST', 'PUT', 'PATCH', 'DELETE') else 'read'
        
        # Record start time
        start_time = time.time()
        
        # Process the request
        try:
            response = self.get_response(request)
            
            # Record execution time
            execution_time = time.time() - start_time
            
            # Record query
            if tenant_id:
                # Estimate row count from response content length
                content_length = len(response.content) if hasattr(response, 'content') else 0
                estimated_row_count = min(content_length // 100, 1000)  # Rough estimate
                
                TenantMetricsCollector.record_query(
                    tenant_id=tenant_id,
                    query_type=query_type,
                    execution_time=execution_time,
                    row_count=estimated_row_count
                )
            
            return response
        except Exception as e:
            # Record error
            if tenant_id:
                TenantMetricsCollector.record_error(
                    tenant_id=tenant_id,
                    error_type=type(e).__name__
                )
            
            # Re-raise exception
            raise