"""
URL Configuration for Menu Management
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MenuCategoryViewSet, MenuItemViewSet, 
    MenuItemReviewViewSet, MenuSpecialViewSet
)

router = DefaultRouter()
router.register(r'categories', MenuCategoryViewSet, basename='menu-category')
router.register(r'items', MenuItemViewSet, basename='menu-item')
router.register(r'reviews', MenuItemReviewViewSet, basename='menu-review')
router.register(r'specials', MenuSpecialViewSet, basename='menu-special')

app_name = 'menu'

urlpatterns = [
    path('', include(router.urls)),
]