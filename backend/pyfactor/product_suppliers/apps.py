from django.apps import AppConfig


class ProductSuppliersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'product_suppliers'
    verbose_name = 'Product Suppliers'
    
    def ready(self):
        """Initialize app when Django starts"""
        pass