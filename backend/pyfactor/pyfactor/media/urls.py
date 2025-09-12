"""
Media URLs for Cloudinary uploads
"""

from django.urls import path
from . import views

app_name = 'media'

urlpatterns = [
    path('upload/', views.upload_image, name='upload_image'),
    path('delete/', views.delete_image, name='delete_image'),
    path('usage/', views.get_cloudinary_usage, name='cloudinary_usage'),
]