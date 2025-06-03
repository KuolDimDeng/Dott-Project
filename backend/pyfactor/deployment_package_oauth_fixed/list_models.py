import os
import sys
import django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()
from django.apps import apps

model_classes = apps.get_models()
print(f'Total model classes: {len(model_classes)}')

for model in sorted(model_classes, key=lambda x: f'{x._meta.app_label}.{x._meta.model_name}'):
    tenant_aware = 'TenantAwareModel' in [c.__name__ for c in model.__mro__]
    has_tenant_id = hasattr(model, 'tenant_id')
    print(f'{model._meta.app_label}.{model._meta.model_name} - Tenant Aware: {tenant_aware} - Has tenant_id: {has_tenant_id}') 