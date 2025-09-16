from django.contrib import admin
from .models import Product, Service, Supplier, Location
from .models_storeitems import StoreItem, MerchantStoreItem, StoreItemVerification

# Import staging admin configurations
from .admin_staging import *

# Register inventory models
admin.site.register(Product)
admin.site.register(Service)
admin.site.register(Supplier)
admin.site.register(Location)

# Register StoreItems models
admin.site.register(StoreItem)
admin.site.register(MerchantStoreItem)
admin.site.register(StoreItemVerification)
