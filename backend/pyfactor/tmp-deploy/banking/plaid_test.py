import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.configuration import Configuration

# Initialize Plaid API
configuration = Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        'clientId': '66d4706be66ef5001a59bbd2',  # Replace with your actual client ID
        'secret': '22874241662b48071ffccf02a5db05',  # Replace with your actual secret
    }
)
api_client = plaid.ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)

# Create a link token request
link_token_request = LinkTokenCreateRequest(
    products=[Products('transactions')],
    client_name="Test App",
    country_codes=[CountryCode('US')],
    language='en',
    user=LinkTokenCreateRequestUser(client_user_id="test_user_id"),
)

response = plaid_client.link_token_create(link_token_request)
print(response)
