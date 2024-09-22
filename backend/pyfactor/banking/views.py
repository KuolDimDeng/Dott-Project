# File: /Users/kuoldeng/projectx/backend/pyfactor/banking/views.py
from django.conf import settings
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import plaid
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_get_request import TransactionsGetRequest

from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.configuration import Configuration
from .models import BankAccount, BankTransaction, PlaidItem
from .serializers import BankAccountSerializer, BankTransactionSerializer
from plaid.model.accounts_get_request import AccountsGetRequest
from pyfactor.logging_config import get_logger
from datetime import datetime, timedelta  # Make sure this line is included
import csv
from django.http import HttpResponse
from .plaid_service import PlaidService
import os
import json
import certifi
import ssl

plaid_service = PlaidService()

# Initialize logger
logger = get_logger()

# Initialize Plaid API configuration
configuration = Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        'clientId': settings.PLAID_CLIENT_ID,
        'secret': settings.PLAID_SECRET,
    }
)

# Create SSL context using certifi to ensure proper SSL certificate verification
ssl_context = ssl.create_default_context(cafile=certifi.where())

# Create Plaid API client
api_client = plaid.ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)

# Bank Account ViewSet
class BankAccountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        return Response({"message": "Sync initiated"})

# Transaction ViewSet
class TransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BankTransactionSerializer

    def get_queryset(self):
        return BankTransaction.objects.filter(account__user=self.request.user)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        transaction = self.get_object()
        transaction.is_reconciled = True
        transaction.save()
        return Response({"message": "Transaction reconciled"})

# Plaid Link Token View
@method_decorator(csrf_exempt, name='dispatch')
class PlaidLinkTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
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
            logger.debug(f"Link token created: {response.link_token}")

            return JsonResponse({'link_token': response.link_token})
        except Exception as e:
            logger.error(f"Error creating link token: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

# Plaid Exchange Token View
@method_decorator(csrf_exempt, name='dispatch')
class PlaidExchangeTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            data = json.loads(request.body)
            public_token = data.get('public_token')

            exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
            exchange_response = plaid_client.item_public_token_exchange(exchange_request)
            access_token = exchange_response.access_token
            item_id = exchange_response.item_id

            PlaidItem.objects.update_or_create(
                user=request.user,
                defaults={'access_token': access_token, 'item_id': item_id}
            )

            return JsonResponse({'success': True})
        except Exception as e:
            logger.error(f"Error exchanging public token: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

# Plaid Accounts View
class PlaidAccountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            plaid_item = PlaidItem.objects.get(user=request.user)
            request = AccountsGetRequest(access_token=plaid_item.access_token)
            response = plaid_client.accounts_get(request)
            
            serializable_accounts = []
            for account in response['accounts']:
                serializable_account = {
                    'account_id': account.account_id,
                    'balances': {
                        'available': account.balances.available,
                        'current': account.balances.current,
                        'limit': account.balances.limit,
                        'iso_currency_code': account.balances.iso_currency_code,
                        'unofficial_currency_code': account.balances.unofficial_currency_code,
                    },
                    'mask': account.mask,
                    'name': account.name,
                    'official_name': account.official_name,
                    'type': str(account.type),  # Convert AccountType enum to string
                    'subtype': str(account.subtype) if account.subtype else None,  # Handle potential None value
                }
                serializable_accounts.append(serializable_account)
            
            logger.debug(f"Serializable accounts: {serializable_accounts}")
            return JsonResponse({'accounts': serializable_accounts})
        except PlaidItem.DoesNotExist:
            return JsonResponse({'accounts': []})
        except Exception as e:
            logger.error(f"Error in PlaidAccountsView: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

# Plaid Transactions View
class PlaidTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            plaid_item = PlaidItem.objects.get(user=request.user)
            start_date = request.GET.get('start_date')
            end_date = request.GET.get('end_date')

            if start_date:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if end_date:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

            transactions = plaid_service.get_transactions(plaid_item.access_token, start_date, end_date)
            return JsonResponse({'transactions': transactions})
        except PlaidItem.DoesNotExist:
            return JsonResponse({'error': 'No Plaid item found for this user'}, status=404)
        except Exception as e:
            logger.error(f"Error in PlaidTransactionsView: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

# Sandbox Public Token Creation View
@method_decorator(csrf_exempt, name='dispatch')
class CreateSandboxPublicTokenView(APIView):
    permission_classes = [IsAuthenticated]

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


class DownloadTransactionsView(APIView):
    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            return Response({"error": "Both start_date and end_date are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        transactions = BankTransaction.objects.filter(date__range=[start_date, end_date])
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="transactions_{start_date}_to_{end_date}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Date', 'Description', 'Amount', 'Type'])

        for transaction in transactions:
            writer.writerow([
                transaction.date.strftime('%Y-%m-%d'),
                transaction.description,
                transaction.amount,
                transaction.transaction_type
            ])

        return response
    


class RecentTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            plaid_item = PlaidItem.objects.get(user=request.user)
            
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
            
            request = TransactionsGetRequest(
                access_token=plaid_item.access_token,
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(
                    count=10,
                    offset=0
                )
            )
            
            response = plaid_client.transactions_get(request)
            
            transactions = []
            for transaction in response['transactions']:
                transactions.append({
                    'id': transaction.transaction_id,
                    'date': str(transaction.date),
                    'description': transaction.name,
                    'amount': transaction.amount,
                    'category': transaction.category[0] if transaction.category else None
                })
            
            return Response({'transactions': transactions})
        except PlaidItem.DoesNotExist:
            return Response({'error': 'No linked bank account found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in RecentTransactionsView: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while fetching recent transactions"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )