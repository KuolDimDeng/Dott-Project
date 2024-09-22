# /Users/kuoldeng/projectx/backend/pyfactor/banking/plaid_service.py

import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.transactions_get_request import TransactionsGetRequest
from datetime import datetime, timedelta
from django.conf import settings

class PlaidService:
    def __init__(self):
        configuration = plaid.Configuration(
            host=plaid.Environment.Sandbox,
            api_key={
                'clientId': settings.PLAID_CLIENT_ID,
                'secret': settings.PLAID_SECRET,
            }
        )
        self.client = plaid_api.PlaidApi(plaid.ApiClient(configuration))

    def create_link_token(self, user_id):
        request = LinkTokenCreateRequest(
            products=[Products('transactions')],
            client_name="Dott",
            country_codes=[CountryCode('US')],
            language='en',
            user=LinkTokenCreateRequestUser(
                client_user_id=str(user_id)
            )
        )
        response = self.client.link_token_create(request)
        return response['link_token']

    def exchange_public_token(self, public_token):
        exchange_request = plaid.ItemPublicTokenExchangeRequest(
            public_token=public_token
        )
        exchange_response = self.client.item_public_token_exchange(exchange_request)
        return exchange_response['access_token'], exchange_response['item_id']

    def get_transactions(self, access_token, start_date, end_date):
        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date
        )
        response = self.client.transactions_get(request)
        return response['transactions']