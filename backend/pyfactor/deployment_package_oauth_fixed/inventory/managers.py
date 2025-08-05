from django.db import models, connection, transaction as db_transaction
from django.db.models import Case, When, F, ExpressionWrapper, BooleanField, DurationField, Sum, Avg, Count
from django.db.models.functions import Now
from django.utils import timezone
import logging

# RLS: Importing tenant context functions
from custom_auth.rls import set_current_tenant_id, tenant_context

logger = logging.getLogger(__name__)

class OptimizedProductManager(models.Manager):
    """
    Optimized manager for Product model with tenant-aware queries
    and performance optimizations.
    """
    
    def get_queryset(self):
        """
        Get base queryset with essential related objects
        """
        return super().get_queryset().select_related('department')
    
    def for_tenant(self, tenant_id):
        """
        Get queryset with proper tenant context
        
        Args:
            tenant_id (uuid.UUID): The tenant ID
            
        Returns:
            QuerySet: Queryset with tenant context
        """
        if not tenant_id:
            logger.warning("No tenant ID provided, using default schema")
            return self.get_queryset()
        
        # Set tenant context directly
        try:
            with connection.cursor() as cursor:
                # Set tenant context
                set_current_tenant_id(tenant_id)
                cursor.execute('SET search_path TO public')
                
                # Verify search path was set
                cursor.execute('SHOW search_path')
                current_path = cursor.fetchone()[0]
                logger.debug(f"Set search path to: {current_path}")
                
                if 'public' not in current_path:
                    logger.error(f"Failed to set search_path to public, got: {current_path}")
                    # Return empty queryset if search path couldn't be set
                    return self.get_queryset().none()
            
            # Return queryset using the current connection with the tenant context set
            return self.get_queryset()
            
        except Exception as e:
            logger.error(f"Error setting tenant context for tenant {tenant_id}: {str(e)}", exc_info=True)
            # In case of errors, return empty queryset
            return self.get_queryset().none()
    
    # Added utility method to help with direct schema queries
    def execute_in_schema(self, tenant_id, sql, params=None):
        """
        Execute raw SQL in a specific schema context
        
        Args:
            tenant_id (uuid.UUID): The tenant ID
            sql (str): SQL query to execute
            params (list, optional): Query parameters
            
        Returns:
            list: Result rows or None on error
        """
        if not tenant_id:
            logger.error("No tenant ID provided for execute_in_schema")
            return None
            
        try:
            with connection.cursor() as cursor:
                # Set schema context
                set_current_tenant_id(tenant_id)
                cursor.execute('SET search_path TO public')
                
                # Execute the query
                cursor.execute(sql, params or [])
                
                # Fetch results
                columns = [col[0] for col in cursor.description]
                return [dict(zip(columns, row)) for row in cursor.fetchall()]
                
        except Exception as e:
            logger.error(f"Error executing SQL in tenant {tenant_id}: {str(e)}", exc_info=True)
            return None
    
    def with_inventory_stats(self):
        """
        Include inventory statistics with a single query
        
        Returns:
            QuerySet: Queryset with annotated inventory statistics
        """
        return self.get_queryset().annotate(
            low_stock=Case(
                When(stock_quantity__lt=F('reorder_level'), then=True),
                default=False,
                output_field=BooleanField()
            ),
            days_in_inventory=ExpressionWrapper(
                Now() - F('created_at'),
                output_field=DurationField()
            ),
            inventory_value=ExpressionWrapper(
                F('stock_quantity') * F('price'),
                output_field=models.DecimalField(max_digits=12, decimal_places=2)
            )
        )
    
    def get_stats(self, tenant_id):
        """
        Get inventory statistics
        
        Args:
            tenant_id (uuid.UUID): The tenant ID
            
        Returns:
            dict: Dictionary with inventory statistics
        """
        queryset = self.for_tenant(tenant_id) if tenant_id else self.get_queryset()
        
        # Use aggregation for efficient statistics calculation
        stats = queryset.aggregate(
            total_products=Count('id'),
            total_value=Sum(F('stock_quantity') * F('price')),
            avg_price=Avg('price')
        )
        
        # Count low stock items separately
        low_stock_count = queryset.filter(
            stock_quantity__lt=F('reorder_level')
        ).count()
        
        # Add low stock count to stats
        stats['low_stock_count'] = low_stock_count
        
        # Ensure values are not None
        stats['total_value'] = stats['total_value'] or 0
        stats['avg_price'] = stats['avg_price'] or 0
        
        return stats
    
    def filter_by_params(self, params):
        """
        Filter products by query parameters
        
        Args:
            params (dict): Query parameters
            
        Returns:
            QuerySet: Filtered queryset
        """
        queryset = self.get_queryset()
        
        # Apply filters based on parameters
        if params.get('is_for_sale') is not None:
            is_for_sale = params.get('is_for_sale').lower() == 'true'
            queryset = queryset.filter(is_for_sale=is_for_sale)
        
        if params.get('min_stock'):
            try:
                min_stock = int(params.get('min_stock'))
                queryset = queryset.filter(stock_quantity__gte=min_stock)
            except (ValueError, TypeError):
                pass
        
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                models.Q(name__icontains=search_term) |
                models.Q(product_code__icontains=search_term) |
                models.Q(description__icontains=search_term)
            )
        
        if params.get('department'):
            queryset = queryset.filter(department__dept_name=params.get('department'))
        
        return queryset
    
    def get_ultra_fast(self, params=None):
        """
        Get minimal product data for ultra-fast listing
        
        Args:
            params (dict, optional): Query parameters
            
        Returns:
            QuerySet: Optimized queryset with minimal fields
        """
        queryset = self.get_queryset()
        
        # Apply filters if params provided
        if params:
            queryset = self.filter_by_params(params)
        
        # Only select essential fields for better performance
        return queryset.only(
            'id', 'name', 'product_code', 'stock_quantity',
            'reorder_level', 'price', 'is_for_sale'
        )
    
    def get_with_department(self, params=None):
        """
        Get products with department information
        
        Args:
            params (dict, optional): Query parameters
            
        Returns:
            QuerySet: Queryset with department information
        """
        queryset = self.get_queryset()
        
        # Apply filters if params provided
        if params:
            queryset = self.filter_by_params(params)
        
        # Select related department and add department name annotation
        return queryset.select_related('department').annotate(
            department_name=F('department__dept_name')
        )