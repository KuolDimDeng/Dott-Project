import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
from django.utils.text import slugify
import random
import string
from io import BytesIO
from barcode import Code128
from barcode.writer import ImageWriter
from .managers import OptimizedProductManager

class InventoryItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    sku = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    quantity = models.IntegerField(default=0, db_index=True)
    reorder_level = models.IntegerField(default=10)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True, related_name='items')
    supplier = models.ForeignKey('Supplier', on_delete=models.SET_NULL, null=True, related_name='items')
    location = models.ForeignKey('Location', on_delete=models.SET_NULL, null=True, related_name='items')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['name', 'sku']),
            models.Index(fields=['quantity', 'reorder_level']),
            models.Index(fields=['category', 'supplier']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Supplier(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Location(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class InventoryTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('ADJUST', 'Adjustment'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=6, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.item.name} ({self.quantity})"

class CustomChargePlan(models.Model):
    name = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('unit', 'Per Unit'),
        ('hour', 'Per Hour'),
        ('day', 'Per Day'),
        ('week', 'Per Week'),
        ('month', 'Per Month'),
        ('custom', 'Custom'),
    ]
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    custom_unit = models.CharField(max_length=50, blank=True, null=True)
    PERIOD_CHOICES = [
        ('hour', 'Hour'),
        ('day', 'Day'),
        ('week', 'Week'),
        ('month', 'Month'),
        ('custom', 'Custom'),
    ]
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    custom_period = models.CharField(max_length=50, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        unit = self.custom_unit if self.unit == 'custom' else self.get_unit_display()
        period = self.custom_period if self.period == 'custom' else self.get_period_display()
        return f"{self.name}: {self.quantity} {unit} per {period} for {self.price}"

class Item(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_for_sale = models.BooleanField(default=True)
    is_for_rent = models.BooleanField(default=False)
    salesTax = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height_unit = models.CharField(max_length=10, choices=[('cm', 'Centimeter'), ('m', 'Meter'), ('in', 'Inch')], default='cm')
    width_unit = models.CharField(max_length=10, choices=[('cm', 'Centimeter'), ('m', 'Meter'), ('in', 'Inch')], default='cm')
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=10, choices=[('kg', 'Kilogram'), ('lb', 'Pound'), ('g', 'Gram')], default='kg')
    charge_period = models.CharField(max_length=10, choices=[('hour', 'Hour'), ('day', 'Day'), ('month', 'Month'), ('year', 'Year')], default='day')
    charge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    custom_charge_plans = models.ManyToManyField(CustomChargePlan, blank=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.name

    def clean(self):
        if self.price < 0:
            raise ValidationError('Price must be non-negative.')

    @property
    def days_in_stock(self):
        return (timezone.now() - self.created_at).days

    @classmethod
    def generate_unique_code(cls, name, field):
        import time
        import random
        import string
        from django.utils.text import slugify
        
        # Create a base from the name
        base = slugify(name)[:20]
        
        # Add timestamp for uniqueness
        timestamp = int(time.time())
        
        # Add random string
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        
        # Combine to create a unique code
        return f"{base}_{timestamp}_{random_str}"

class Product(Item):
    product_code = models.CharField(max_length=50, unique=True, editable=False, db_index=True)
    department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, related_name='products')
    stock_quantity = models.IntegerField(default=0, db_index=True)
    reorder_level = models.IntegerField(default=0)
    
    # Use the default manager for backwards compatibility
    objects = models.Manager()
    
    # Add the optimized manager
    optimized = OptimizedProductManager()

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['product_code']),
            models.Index(fields=['stock_quantity', 'reorder_level']),
            models.Index(fields=['is_for_sale', 'price']),
            models.Index(fields=['created_at']),
            # Add index for common filter combinations
            models.Index(fields=['is_for_sale', 'stock_quantity']),
            models.Index(fields=['department', 'stock_quantity']),
        ]
        app_label = 'inventory'

    def save(self, *args, **kwargs):
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        
        # Log the current database connection and schema
        from django.db import connection
        from pyfactor.db_routers import TenantSchemaRouter
        
        # Get optimized connection for the current schema
        with connection.cursor() as cursor:
            cursor.execute('SHOW search_path')
            current_schema = cursor.fetchone()[0]
            logger.debug(f"Saving product in schema: {current_schema}, using connection: {connection.alias}")
        
        # Generate product code if needed
        if not self.product_code:
            self.product_code = self.generate_unique_code(self.name, 'product_code')
        
        try:
            # Use the current connection with optimized schema handling
            # Remove explicit 'default' connection to use the tenant's connection
            
            # Use a transaction for atomicity
            from django.db import transaction
            with transaction.atomic():
                super().save(*args, **kwargs)
                
            logger.debug(f"Successfully saved product {self.name} with ID {self.id} in {time.time() - start_time:.4f}s")
        except Exception as e:
            logger.error(f"Error saving product: {str(e)}", exc_info=True)
            raise

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._state.db = db
        return instance
    
    def get_barcode_image(self):
        rv = BytesIO()
        Code128(self.product_code, writer=ImageWriter()).write(rv)
        return rv.getvalue()

class Service(Item):
    service_code = models.CharField(max_length=50, unique=True, editable=False, db_index=True)
    duration = models.DurationField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False, db_index=True)
    
    # Use the default manager for backwards compatibility
    objects = models.Manager()
    
    # Add the optimized manager
    from .service_managers import OptimizedServiceManager
    optimized = OptimizedServiceManager()

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['service_code']),
            models.Index(fields=['is_recurring']),
            models.Index(fields=['is_for_sale', 'price']),
            models.Index(fields=['created_at']),
            # Add index for common filter combinations
            models.Index(fields=['is_for_sale', 'is_recurring']),
        ]
        app_label = 'inventory'

    def save(self, *args, **kwargs):
        import logging
        import time
        logger = logging.getLogger(__name__)
        
        start_time = time.time()
        
        # Log the current database connection and schema
        from django.db import connection
        from pyfactor.db_routers import TenantSchemaRouter
        
        # Get optimized connection for the current schema
        with connection.cursor() as cursor:
            cursor.execute('SHOW search_path')
            current_schema = cursor.fetchone()[0]
            logger.debug(f"Saving service in schema: {current_schema}, using connection: {connection.alias}")
        
        # Generate service code if needed
        if not self.service_code:
            self.service_code = self.generate_unique_code(self.name, 'service_code')
        
        try:
            # Use the current connection with optimized schema handling
            # Remove explicit 'default' connection to use the tenant's connection
            
            # Use a transaction for atomicity
            from django.db import transaction
            with transaction.atomic():
                super().save(*args, **kwargs)
                
            logger.debug(f"Successfully saved service {self.name} with ID {self.id} in {time.time() - start_time:.4f}s")
        except Exception as e:
            logger.error(f"Error saving service: {str(e)}", exc_info=True)
            raise
        
    @classmethod
    def generate_unique_code(cls, name, field):
        import time
        import random
        import string
        from django.utils.text import slugify
        
        # Create a base from the name
        base = slugify(name)[:20]
        
        # Add timestamp for uniqueness
        timestamp = int(time.time())
        
        # Add random string
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        
        # Combine to create a unique code
        return f"{base}_{timestamp}_{random_str}"
        
    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._state.db = db
        return instance

class ProductTypeFields(models.Model):
    """Store dynamic fields for products based on business type"""
    product = models.OneToOneField('Product', on_delete=models.CASCADE, related_name='type_fields')
    
    # Common fields many businesses might use
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    
    # Fields for various business types
    # E-commerce fields
    material = models.CharField(max_length=100, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    condition = models.CharField(max_length=50, blank=True, null=True)
    
    # Food/beverage fields
    ingredients = models.TextField(blank=True, null=True)
    allergens = models.TextField(blank=True, null=True)
    nutritional_info = models.TextField(blank=True, null=True)
    
    # Apparel fields
    size = models.CharField(max_length=20, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    
    # Trucking/vehicle fields
    vehicle_type = models.CharField(max_length=100, blank=True, null=True)
    load_capacity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Store additional fields that don't fit the predefined ones
    extra_fields = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "Product Type Field"
        verbose_name_plural = "Product Type Fields"
        app_label = 'inventory'

class ServiceTypeFields(models.Model):
    """Store dynamic fields for services based on business type"""
    service = models.OneToOneField('Service', on_delete=models.CASCADE, related_name='type_fields')
    
    # Common fields
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    
    # Professional service fields
    skill_level = models.CharField(max_length=50, blank=True, null=True)
    certification = models.CharField(max_length=100, blank=True, null=True)
    experience_years = models.PositiveIntegerField(null=True, blank=True)
    
    # Appointment-based fields
    min_booking_notice = models.DurationField(null=True, blank=True)
    buffer_time = models.DurationField(null=True, blank=True)
    
    # Event/venue fields
    max_capacity = models.PositiveIntegerField(null=True, blank=True)
    amenities = models.TextField(blank=True, null=True)
    
    # Transportation fields
    service_area = models.CharField(max_length=100, blank=True, null=True)
    vehicle_requirements = models.TextField(blank=True, null=True)
    
    # Store additional fields
    extra_fields = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "Service Type Field"
        verbose_name_plural = "Service Type Fields"
        app_label = 'inventory'

class Department(models.Model):
    dept_code = models.CharField(max_length=20)
    dept_name = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.dept_name
    
    class Meta:
        app_label = 'inventory'