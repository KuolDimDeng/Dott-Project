from django.urls import path
from .views import ConsumerSearchViewSet
from .order_views import ConsumerOrderViewSet, ConsumerFavoriteViewSet
from .payment_views import (
    create_payment_intent,
    process_mpesa_payment,
    confirm_payment,
    refund_order,
    get_payment_methods
)
from .placeholder_views import (
    get_marketplace_businesses,
    get_business_categories,
    get_featured_businesses
)

urlpatterns = [
    # Placeholder businesses endpoints (main marketplace)
    path('businesses/', ConsumerSearchViewSet.as_view({'get': 'marketplace_businesses'}), name='marketplace-businesses'),
    path('businesses/categories/', get_business_categories, name='business-categories'),
    path('businesses/featured/', ConsumerSearchViewSet.as_view({'get': 'featured'}), name='featured-businesses'),
    
    # Category hierarchy endpoint (for subcategories)
    path('category_hierarchy/', ConsumerSearchViewSet.as_view({'get': 'marketplace_category_hierarchy'}), name='category-hierarchy'),
    path('marketplace_businesses/', ConsumerSearchViewSet.as_view({'get': 'marketplace_businesses'}), name='marketplace-businesses-alt'),
    
    # Search endpoints
    path('search/', ConsumerSearchViewSet.as_view({'get': 'search', 'post': 'search'}), name='consumer-search'),
    path('categories/', ConsumerSearchViewSet.as_view({'get': 'categories'}), name='consumer-categories'),
    path('update-location/', ConsumerSearchViewSet.as_view({'post': 'update_location'}), name='update-location'),
    
    # Order endpoints
    path('orders/', ConsumerOrderViewSet.as_view({'get': 'list', 'post': 'create'}), name='consumer-orders'),
    path('orders/<uuid:pk>/', ConsumerOrderViewSet.as_view({'get': 'retrieve'}), name='consumer-order-detail'),
    path('orders/<uuid:pk>/cancel/', ConsumerOrderViewSet.as_view({'post': 'cancel'}), name='consumer-order-cancel'),
    path('recent-orders/', ConsumerOrderViewSet.as_view({'get': 'recent_orders'}), name='recent-orders'),
    
    # Favorites endpoints
    path('favorites/', ConsumerFavoriteViewSet.as_view({'get': 'list'}), name='consumer-favorites'),
    path('favorites/toggle/', ConsumerFavoriteViewSet.as_view({'post': 'toggle'}), name='toggle-favorite'),
    path('favorites/check/<uuid:business_id>/', ConsumerFavoriteViewSet.as_view({'get': 'check'}), name='check-favorite'),
    
    # Payment endpoints
    path('payments/create-intent/', create_payment_intent, name='create-payment-intent'),
    path('payments/mpesa/', process_mpesa_payment, name='process-mpesa-payment'),
    path('payments/confirm/', confirm_payment, name='confirm-payment'),
    path('payments/refund/', refund_order, name='refund-order'),
    path('payments/methods/', get_payment_methods, name='get-payment-methods'),
]