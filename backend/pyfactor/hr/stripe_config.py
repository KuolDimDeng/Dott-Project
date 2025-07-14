"""
Stripe Connect Configuration for Dott
"""

# Your Express Connect Account ID
STRIPE_EXPRESS_ACCOUNT_ID = "acct_1RkYGFC77wwa4lUB"

# Account Details
STRIPE_ACCOUNT_INFO = {
    "type": "express",
    "name": "Dott",
    "email": "kuoldimdeng@outlook.com",
    "website": "dottapps.com",
    "business_name": "DOTT LLC KUOL DENG SOLE MBR",
    "statement_descriptor": "DOTTAPPS.COM",
    "country": "US",
    "industry": "Software",
    "mcc": "5734",  # Software, SaaS
    "connected_on": "2025-07-13",
    "capabilities": {
        "card_payments": True,
        "transfers": True,
        "payouts": True
    }
}