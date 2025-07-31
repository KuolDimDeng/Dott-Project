"""
Database optimization utilities and query helpers
"""
from django.db import models
from django.db.models import Prefetch, F, Q, Count, Sum, Avg
from django.core.paginator import Paginator
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class OptimizedQuerySet:
    """
    Helper class for building optimized querysets with common patterns
    """
    
    @staticmethod
    def get_user_with_profile(user_id: int):
        """Get user with all related data in a single query"""
        from custom_auth.models import User
        
        return User.objects.select_related(
            'profile',
            'profile__business',
            'profile__business__details',
            'profile__business__details__country'
        ).prefetch_related(
            'page_access__page',
            'employee_set',
            'onboarding_progress'
        ).get(id=user_id)
    
    @staticmethod
    def get_business_with_details(business_id: str):
        """Get business with all related data"""
        from users.models import Business
        
        return Business.objects.select_related(
            'details',
            'details__country',
            'owner',
            'owner__profile'
        ).prefetch_related(
            'employees',
            'customers',
            'vendors',
            'products',
            'invoices',
        ).get(id=business_id)
    
    @staticmethod
    def get_invoices_optimized(business_id: str, limit: int = 100):
        """Get invoices with all related data"""
        from finance.models import Invoice
        
        return Invoice.objects.filter(
            business_id=business_id
        ).select_related(
            'customer',
            'created_by',
            'updated_by'
        ).prefetch_related(
            'items__product',
            'payments'
        ).order_by('-created_at')[:limit]
    
    @staticmethod
    def get_dashboard_metrics(business_id: str, start_date, end_date):
        """Get dashboard metrics with optimized queries"""
        from finance.models import Invoice, Payment
        from crm.models import Customer
        from hr.models import Employee
        from django.db.models import Q
        
        # Use aggregation instead of multiple queries
        invoice_stats = Invoice.objects.filter(
            business_id=business_id,
            created_at__range=[start_date, end_date]
        ).aggregate(
            total_revenue=Sum('total_amount'),
            total_invoices=Count('id'),
            avg_invoice=Avg('total_amount'),
            unpaid_count=Count('id', filter=Q(status='unpaid')),
            unpaid_amount=Sum('total_amount', filter=Q(status='unpaid'))
        )
        
        payment_stats = Payment.objects.filter(
            business_id=business_id,
            payment_date__range=[start_date, end_date]
        ).aggregate(
            total_collected=Sum('amount'),
            payment_count=Count('id')
        )
        
        # Get counts in single queries
        customer_count = Customer.objects.filter(
            business_id=business_id
        ).count()
        
        employee_count = Employee.objects.filter(
            business_id=business_id,
            is_active=True
        ).count()
        
        return {
            'revenue': invoice_stats['total_revenue'] or 0,
            'invoices': invoice_stats['total_invoices'] or 0,
            'average_invoice': invoice_stats['avg_invoice'] or 0,
            'unpaid_invoices': invoice_stats['unpaid_count'] or 0,
            'unpaid_amount': invoice_stats['unpaid_amount'] or 0,
            'collected': payment_stats['total_collected'] or 0,
            'payments': payment_stats['payment_count'] or 0,
            'customers': customer_count,
            'employees': employee_count
        }


class BulkOperations:
    """
    Helper class for bulk database operations
    """
    
    @staticmethod
    def bulk_create_with_validation(model_class, objects: List[Dict], batch_size: int = 1000):
        """Bulk create with validation and error handling"""
        created_objects = []
        errors = []
        
        for i in range(0, len(objects), batch_size):
            batch = objects[i:i + batch_size]
            instances = []
            
            for obj_data in batch:
                try:
                    instance = model_class(**obj_data)
                    instance.full_clean()  # Validate
                    instances.append(instance)
                except Exception as e:
                    errors.append({
                        'data': obj_data,
                        'error': str(e)
                    })
            
            if instances:
                try:
                    created = model_class.objects.bulk_create(instances)
                    created_objects.extend(created)
                except Exception as e:
                    logger.error(f"Bulk create error: {str(e)}")
                    errors.append({
                        'batch': i,
                        'error': str(e)
                    })
        
        return created_objects, errors
    
    @staticmethod
    def bulk_update_optimized(model_class, updates: List[Dict], fields: List[str], batch_size: int = 500):
        """Optimized bulk update"""
        # Group updates by ID
        instances = []
        
        for update in updates:
            instance_id = update.pop('id')
            instance = model_class(id=instance_id, **update)
            instances.append(instance)
        
        # Bulk update in batches
        updated_count = 0
        for i in range(0, len(instances), batch_size):
            batch = instances[i:i + batch_size]
            model_class.objects.bulk_update(batch, fields)
            updated_count += len(batch)
        
        return updated_count


class QueryOptimizer:
    """
    Query optimization utilities
    """
    
    @staticmethod
    def optimize_pagination(queryset, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """Optimize pagination with count caching"""
        paginator = Paginator(queryset, per_page)
        
        # Use iterator for large datasets
        if paginator.count > 10000:
            page_obj = paginator.page(page)
            items = list(page_obj.object_list.iterator())
        else:
            page_obj = paginator.page(page)
            items = list(page_obj.object_list)
        
        return {
            'items': items,
            'total': paginator.count,
            'page': page,
            'per_page': per_page,
            'pages': paginator.num_pages,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous()
        }
    
    @staticmethod
    def use_only_fields(queryset, fields: List[str]):
        """Optimize by selecting only required fields"""
        return queryset.only(*fields)
    
    @staticmethod
    def use_defer_fields(queryset, fields: List[str]):
        """Optimize by deferring heavy fields"""
        return queryset.defer(*fields)
    
    @staticmethod
    def add_select_related(queryset, *relations):
        """Add select_related for foreign keys"""
        return queryset.select_related(*relations)
    
    @staticmethod
    def add_prefetch_related(queryset, *relations):
        """Add prefetch_related for many-to-many and reverse foreign keys"""
        return queryset.prefetch_related(*relations)


# Database query analyzer for development
class QueryAnalyzer:
    """
    Analyze and log database queries for optimization
    """
    
    @staticmethod
    def analyze_view_queries(view_func):
        """Decorator to analyze queries in a view"""
        from django.db import connection
        from django.db import reset_queries
        import functools
        
        @functools.wraps(view_func)
        def wrapper(*args, **kwargs):
            reset_queries()
            
            result = view_func(*args, **kwargs)
            
            # Log query analysis
            queries = connection.queries
            total_time = sum(float(q['time']) for q in queries)
            
            logger.info(f"Query Analysis for {view_func.__name__}:")
            logger.info(f"Total Queries: {len(queries)}")
            logger.info(f"Total Time: {total_time:.3f}s")
            
            # Identify slow queries
            slow_queries = [q for q in queries if float(q['time']) > 0.1]
            if slow_queries:
                logger.warning(f"Slow Queries Found: {len(slow_queries)}")
                for q in slow_queries:
                    logger.warning(f"Time: {q['time']}s - SQL: {q['sql'][:100]}...")
            
            # Identify duplicate queries
            query_counts = {}
            for q in queries:
                sql = q['sql']
                query_counts[sql] = query_counts.get(sql, 0) + 1
            
            duplicates = {sql: count for sql, count in query_counts.items() if count > 1}
            if duplicates:
                logger.warning(f"Duplicate Queries Found: {len(duplicates)}")
                for sql, count in duplicates.items():
                    logger.warning(f"Count: {count} - SQL: {sql[:100]}...")
            
            return result
        
        return wrapper