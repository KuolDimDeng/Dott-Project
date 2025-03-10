from django.db import models, connection, transaction
from django.db.models import Case, When, F, ExpressionWrapper, BooleanField, DurationField, Sum, Avg, Count
from django.utils import timezone
import logging

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
    
    def for_tenant(self, schema_name):
        """
        Get queryset with proper tenant context
        
        Args:
            schema_name (str): The tenant schema name
            
        Returns:
            QuerySet: Queryset with tenant context
        """
        if not schema_name:
            logger.warning("No schema name provided, using default schema")
            return self.get_queryset()
        
        # Use a single transaction for better performance
        with transaction.atomic():
            # Set search path once
            with connection.cursor() as cursor:
                cursor.execute(f'SET LOCAL search_path TO "{schema_name}",public')
            
            # Return optimized queryset
            return self.get_queryset()
    
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
                timezone.now() - F('created_at'),
                output_field=DurationField()
            ),
            inventory_value=ExpressionWrapper(
                F('stock_quantity') * F('price'),
                output_field=models.DecimalField(max_digits=12, decimal_places=2)
            )
        )
    
    def get_stats(self, schema_name=None):
        """
        Get inventory statistics
        
        Args:
            schema_name (str, optional): The tenant schema name
            
        Returns:
            dict: Dictionary with inventory statistics
        """
        queryset = self.for_tenant(schema_name) if schema_name else self.get_queryset()
        
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