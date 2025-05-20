# In sales/forms.py
from django import forms
from .models import Product, Service, ProductTypeFields, ServiceTypeFields
from .utils import get_product_fields_for_business, get_service_fields_for_business

class DynamicProductForm(forms.ModelForm):
    """Form that dynamically shows fields based on business type"""
    
    # Define fields that aren't in the base Product model
    category = forms.CharField(max_length=100, required=False)
    subcategory = forms.CharField(max_length=100, required=False)
    material = forms.CharField(max_length=100, required=False)
    brand = forms.CharField(max_length=100, required=False)
    condition = forms.CharField(max_length=50, required=False)
    ingredients = forms.CharField(widget=forms.Textarea, required=False)
    allergens = forms.CharField(widget=forms.Textarea, required=False)
    nutritional_info = forms.CharField(widget=forms.Textarea, required=False)
    size = forms.CharField(max_length=20, required=False)
    color = forms.CharField(max_length=50, required=False)
    gender = forms.CharField(max_length=20, required=False)
    vehicle_type = forms.CharField(max_length=100, required=False)
    load_capacity = forms.DecimalField(max_digits=10, decimal_places=2, required=False)
    marketplace_id = forms.CharField(max_length=100, required=False)
    store_url = forms.URLField(required=False)
    inventory_tracking = forms.BooleanField(required=False)
    restock_threshold = forms.IntegerField(required=False)
    vehicle_specifications = forms.CharField(widget=forms.Textarea, required=False)
    special_handling_requirements = forms.CharField(widget=forms.Textarea, required=False)
    extra_fields = forms.JSONField(required=False, widget=forms.HiddenInput())
    
    class Meta:
        model = Product
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        business = kwargs.pop('business', None)
        super().__init__(*args, **kwargs)
        
        if business:
            # Get relevant fields for this business
            relevant_fields = set(get_product_fields_for_business(business))
            
            # Hide irrelevant fields
            for field_name in list(self.fields.keys()):
                if field_name not in relevant_fields and field_name != 'extra_fields':
                    self.fields[field_name].widget = forms.HiddenInput()
                    self.fields[field_name].required = False