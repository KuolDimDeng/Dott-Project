from django.conf import settings
from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.mixins import LoginRequiredMixin

from banking.plaid_service import PlaidService
from .models import BankAccount, BankTransaction, PlaidItem
from .serializers import BankAccountSerializer, BankTransactionSerializer
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.configuration import Configuration
from pyfactor.logging_config import get_logger
import ssl

import plaid
import json


logger = get_logger()




configuration = Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        'clientId': settings.PLAID_CLIENT_ID,
        'secret': settings.PLAID_SECRET,
    }
)

api_client = plaid.ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)

class BankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        return Response({"message": "Sync initiated"})

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = BankTransactionSerializer

    def get_queryset(self):
        return BankTransaction.objects.filter(account__user=self.request.user)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        transaction = self.get_object()
        transaction.is_reconciled = True
        transaction.save()
        return Response({"message": "Transaction reconciled"})

@method_decorator(csrf_exempt, name='dispatch')
class PlaidLinkTokenView(LoginRequiredMixin, View):
    def get(self, request):
        return self.create_link_token(request)

    def post(self, request):
        return self.create_link_token(request)

    def create_link_token(self, request):
        try:
            user = request.user
            logger.debug(f"Creating link token for user: {user.id}")
            
            link_token_request = LinkTokenCreateRequest(
                products=[Products('transactions')],
                client_name="Pyfactor",
                country_codes=[CountryCode('US')],
                language='en',
                user=LinkTokenCreateRequestUser(
                    client_user_id=str(user.id)
                )
            )
            
            response = plaid_client.link_token_create(link_token_request)
            logger.debug(f"Link token created: {response['link_token']}")
            
            return JsonResponse({'link_token': response['link_token']})
        except Exception as e:
            logger.error(f"Error creating link token: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class PlaidExchangeTokenView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            public_token = data.get('public_token')
            exchange_request = ItemPublicTokenExchangeRequest(
                public_token=public_token
            )
            exchange_response = plaid_client.item_public_token_exchange(exchange_request)
            access_token = exchange_response['access_token']
            item_id = exchange_response['item_id']
            
            PlaidItem.objects.update_or_create(
                user=request.user,
                defaults={'access_token': access_token, 'item_id': item_id}
            )
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

class PlaidAccountsView(View):
    def get(self, request):
        try:
            plaid_item = PlaidItem.objects.get(user=request.user)
            logger.debug(f"PlaidItem found for user: {request.user.id}")
            response = plaid_client.accounts_get(plaid_item.access_token)
            logger.debug(f"Plaid API response: {response}")
            return JsonResponse({'accounts': response['accounts']})
        except PlaidItem.DoesNotExist:
            logger.warning(f"No PlaidItem found for user: {request.user.id}")
            return JsonResponse({'accounts': []})
        except Exception as e:
            logger.error(f"Error in PlaidAccountsView: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

class PlaidTransactionsView(View):
    def get(self, request, account_id):
        try:
            plaid_item = PlaidItem.objects.get(user=request.user)
            start_date = request.GET.get('start_date')
            end_date = request.GET.get('end_date')
            # You'll need to implement this method in your PlaidService
            transactions = PlaidService.get_transactions(plaid_item.access_token, start_date, end_date, account_id)
            return JsonResponse({'transactions': transactions})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class CreateSandboxPublicTokenView(View):
    def post(self, request):
        try:
            create_request = SandboxPublicTokenCreateRequest(
                institution_id='ins_109508',
                initial_products=['transactions']
            )
            response = plaid_client.sandbox_public_token_create(create_request)
            public_token = response['public_token']
            return JsonResponse({'public_token': public_token})
        except plaid.ApiException as e:
            return JsonResponse({'error': str(e)}, status=400)

# This view is redundant with PlaidExchangeTokenView, consider removing it
@method_decorator(csrf_exempt, name='dispatch')
class ExchangePublicTokenView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
            public_token = data.get('public_token')
            exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
            exchange_response = plaid_client.item_public_token_exchange(exchange_request)
            access_token = exchange_response['access_token']
            item_id = exchange_response['item_id']
            
            # Save the access_token and item_id for the user
            PlaidItem.objects.update_or_create(
                user=request.user,
                defaults={'access_token': access_token, 'item_id': item_id}
            )
            
            return JsonResponse({'success': True})
        except plaid.ApiException as e:
            return JsonResponse({'error': str(e)}, status=400)