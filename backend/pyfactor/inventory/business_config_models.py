"""
Business Type-Specific Inventory Configuration Models
"""

from django.db import models
from django.contrib.postgres.fields import ArrayField
import uuid


class BusinessInventoryConfig(models.Model):
    """
    Configuration for inventory system based on business type
    Stores terminology, features, and UI customization per business type
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('custom_auth.Tenant', on_delete=models.CASCADE)
    business_type = models.CharField(max_length=50)
    
    # Terminology customization
    inventory_term = models.CharField(max_length=50, default='Inventory')  # Products, Supplies, Materials, etc.
    item_singular = models.CharField(max_length=50, default='Item')  # Product, Supply, Part, Ingredient
    item_plural = models.CharField(max_length=50, default='Items')
    
    # Default categories for this business type
    default_categories = models.JSONField(default=list)
    
    # Field configuration
    required_fields = models.JSONField(default=list)  # Fields that must be filled
    optional_fields = models.JSONField(default=list)  # Fields that are shown but optional
    hidden_fields = models.JSONField(default=list)    # Fields that are never shown
    
    # Feature toggles
    features = models.JSONField(default=dict)
    # Example features:
    # {
    #     'expiry_tracking': True,
    #     'batch_tracking': False,
    #     'recipe_costing': True,
    #     'bill_of_materials': False,
    #     'rental_management': False,
    #     'prescription_tracking': False,
    #     'temperature_monitoring': True,
    #     'barcode_scanning': True,
    #     'category_management': True,
    # }
    
    # UI customization
    show_in_menu = models.BooleanField(default=True)
    menu_icon = models.CharField(max_length=50, default='cube-outline')
    menu_position = models.IntegerField(default=3)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'inventory_business_config'
        unique_together = ['tenant', 'business_type']
        indexes = [
            models.Index(fields=['tenant', 'business_type']),
        ]
    
    def __str__(self):
        return f"{self.business_type} - {self.inventory_term}"
    
    @classmethod
    def get_default_config(cls, business_type):
        """Get default configuration for a business type"""
        configs = {
            'RESTAURANT_CAFE': {
                'inventory_term': 'Ingredients & Supplies',
                'item_singular': 'Ingredient',
                'item_plural': 'Ingredients',
                'default_categories': ['Food Items', 'Beverages', 'Packaging', 'Cleaning'],
                'required_fields': ['name', 'quantity_on_hand', 'expiry_date', 'storage_temperature'],
                'optional_fields': ['supplier', 'allergen_info', 'nutritional_info'],
                'hidden_fields': ['rental_daily_rate', 'rental_deposit', 'prescription_required'],
                'features': {
                    'expiry_tracking': True,
                    'batch_tracking': False,
                    'recipe_costing': True,
                    'waste_tracking': True,
                    'temperature_monitoring': True,
                    'portion_control': True,
                    'allergen_management': True,
                }
            },
            'PLUMBER': {
                'inventory_term': 'Parts & Tools',
                'item_singular': 'Part',
                'item_plural': 'Parts',
                'default_categories': ['Tools', 'Pipes & Fittings', 'Valves', 'Sealants', 'Safety Equipment'],
                'required_fields': ['name', 'quantity_on_hand', 'material_type', 'cost'],
                'optional_fields': ['supplier', 'reorder_point', 'location'],
                'hidden_fields': ['expiry_date', 'batch_number', 'prescription_required'],
                'features': {
                    'bill_of_materials': True,
                    'job_linking': True,
                    'tool_checkout': True,
                    'supplier_catalog': True,
                }
            },
            'PHARMACY': {
                'inventory_term': 'Medications',
                'item_singular': 'Medication',
                'item_plural': 'Medications',
                'default_categories': ['Prescription Drugs', 'OTC Medications', 'Medical Devices', 'Health Products'],
                'required_fields': ['name', 'batch_number', 'expiry_date', 'manufacturer', 'quantity_on_hand'],
                'optional_fields': ['controlled_substance_schedule', 'storage_requirements', 'ndc_code'],
                'hidden_fields': ['material_type', 'rental_daily_rate'],
                'features': {
                    'prescription_tracking': True,
                    'batch_tracking': True,
                    'expiry_management': True,
                    'regulatory_compliance': True,
                    'drug_interaction_warnings': True,
                    'temperature_monitoring': True,
                    'insurance_billing': True,
                }
            },
            'SALON_SPA': {
                'inventory_term': 'Products',
                'item_singular': 'Product',
                'item_plural': 'Products',
                'default_categories': ['Professional Products', 'Retail Products', 'Equipment', 'Linens', 'Consumables'],
                'required_fields': ['name', 'brand', 'quantity_on_hand', 'category'],
                'optional_fields': ['client_price', 'retail_price', 'commission_rate'],
                'hidden_fields': ['prescription_required', 'controlled_substance_schedule'],
                'features': {
                    'dual_inventory': True,
                    'client_preferences': True,
                    'product_usage_tracking': True,
                    'commission_management': True,
                    'appointment_linking': True,
                }
            },
            'RETAIL_STORE': {
                'inventory_term': 'Products',
                'item_singular': 'Product',
                'item_plural': 'Products',
                'default_categories': [],  # Dynamic based on store type
                'required_fields': ['name', 'sku', 'price', 'quantity_on_hand'],
                'optional_fields': ['barcode', 'supplier', 'category', 'brand', 'size', 'color'],
                'hidden_fields': ['expiry_date', 'batch_number', 'prescription_required'],
                'features': {
                    'barcode_scanning': True,
                    'category_management': True,
                    'price_tag_printing': True,
                    'seasonal_tracking': True,
                    'multi_location': True,
                    'pos_integration': True,
                }
            },
            # Default configuration
            'OTHER': {
                'inventory_term': 'Inventory',
                'item_singular': 'Item',
                'item_plural': 'Items',
                'default_categories': ['General'],
                'required_fields': ['name', 'quantity_on_hand'],
                'optional_fields': ['sku', 'price', 'cost', 'description'],
                'hidden_fields': [],
                'features': {
                    'basic': True,
                }
            }
        }
        
        return configs.get(business_type, configs['OTHER'])


class InventoryTemplate(models.Model):
    """
    Pre-configured inventory items for business types
    Helps businesses quickly add common items
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_type = models.CharField(max_length=50)
    category = models.CharField(max_length=100)
    
    # Template item details
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    default_unit = models.CharField(max_length=50)
    
    MATERIAL_TYPE_CHOICES = [
        ('consumable', 'Consumable'),
        ('reusable', 'Reusable'),
        ('service', 'Service'),
    ]
    material_type = models.CharField(max_length=20, choices=MATERIAL_TYPE_CHOICES, default='consumable')
    
    is_commonly_used = models.BooleanField(default=True)
    typical_price_range = models.JSONField(default=dict)  # {'min': 10, 'max': 50}
    
    # Additional metadata
    tags = models.JSONField(default=list)
    search_keywords = models.TextField(blank=True)
    
    class Meta:
        db_table = 'inventory_templates'
        indexes = [
            models.Index(fields=['business_type', 'category']),
            models.Index(fields=['business_type', 'is_commonly_used']),
        ]
        ordering = ['business_type', 'category', 'name']
    
    def __str__(self):
        return f"{self.business_type} - {self.name}"