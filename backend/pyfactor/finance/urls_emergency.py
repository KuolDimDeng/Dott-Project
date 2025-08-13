from django.urls import path
from .views_emergency_fix import emergency_fix_schema

urlpatterns = [
    path('emergency-fix-schema/', emergency_fix_schema, name='emergency_fix_schema'),
]