from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BankAccountViewSet, 
    TransactionViewSet, 
    PlaidLinkTokenView, 
    PlaidExchangeTokenView, 
    PlaidTransactionsView, 
    PlaidAccountsView,
    CreateSandboxPublicTokenView,
    ExchangePublicTokenView
)

router = DefaultRouter()
router.register(r'accounts', BankAccountViewSet, basename='bankaccount')
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('', include(router.urls)),
    path('create_link_token/', PlaidLinkTokenView.as_view(), name='create_link_token'),
    path('exchange_token/', PlaidExchangeTokenView.as_view(), name='exchange_token'),
    path('transactions/<str:account_id>/', PlaidTransactionsView.as_view(), name='transactions'),
    path('create_sandbox_public_token/', CreateSandboxPublicTokenView.as_view(), name='create_sandbox_public_token'),
    path('exchange_public_token/', ExchangePublicTokenView.as_view(), name='exchange_public_token'),
]