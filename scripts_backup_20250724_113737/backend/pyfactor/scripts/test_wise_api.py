#!/usr/bin/env python3
"""
Test Wise API credentials and get Profile ID
"""
import requests
import json
import sys

# Your Wise API credentials
WISE_API_TOKEN = "cda23806-97b9-4155-9a8b-1c27224866fa"
WISE_API_BASE = "https://api.wise.com"

def test_wise_connection():
    """Test Wise API connection and get profile information"""
    print("Testing Wise API connection...")
    print("=" * 50)
    
    headers = {
        "Authorization": f"Bearer {WISE_API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Get profiles
    print("\n1. Getting your Wise profiles...")
    try:
        response = requests.get(
            f"{WISE_API_BASE}/v1/profiles",
            headers=headers
        )
        
        if response.status_code == 200:
            profiles = response.json()
            print(f"✅ Success! Found {len(profiles)} profile(s)")
            
            for i, profile in enumerate(profiles):
                print(f"\nProfile {i+1}:")
                print(f"  - ID: {profile['id']}")
                print(f"  - Type: {profile['type']}")
                print(f"  - Full Name: {profile.get('details', {}).get('name', 'N/A')}")
                
                # This is your WISE_PROFILE_ID
                if profile['type'] == 'business':
                    print(f"\n🎯 YOUR BUSINESS PROFILE ID: {profile['id']}")
                    print(f"   Add this to your environment: WISE_PROFILE_ID={profile['id']}")
                    
                    # Test currency conversion with this profile
                    test_currency_conversion(profile['id'], headers)
                    test_supported_currencies(profile['id'], headers)
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 401:
                print("\n⚠️  Authentication failed. Please check:")
                print("   1. Your API token is correct")
                print("   2. The token has not expired")
                print("   3. The token has the right permissions")
                
    except Exception as e:
        print(f"❌ Error connecting to Wise API: {str(e)}")
        return

def test_currency_conversion(profile_id, headers):
    """Test currency conversion from USD to KES"""
    print("\n" + "=" * 50)
    print("2. Testing currency conversion (USD to KES)...")
    
    # Test quote for $15 to KES - updated format
    quote_data = {
        "source": "USD",
        "target": "KES",
        "sourceAmount": 15.00,
        "rateType": "FIXED",
        "profile": profile_id
    }
    
    try:
        response = requests.post(
            f"{WISE_API_BASE}/v1/quotes",
            headers=headers,
            json=quote_data
        )
        
        if response.status_code == 200:
            quote = response.json()
            print("✅ Currency conversion successful!")
            print(f"\nConversion Details:")
            print(f"  - Rate: 1 USD = {quote['rate']} KES")
            print(f"  - Source: ${quote['sourceAmount']} USD")
            print(f"  - Target: KSh {quote['targetAmount']} KES")
            print(f"  - Fee: ${quote['fee']} USD")
            
            # Calculate with 1% markup
            with_markup = float(quote['targetAmount']) * 1.01
            print(f"\nWith 1% markup:")
            print(f"  - Customer pays: KSh {with_markup:.2f}")
            print(f"  - Your revenue: KSh {with_markup - float(quote['targetAmount']):.2f}")
            
        elif response.status_code == 403:
            print("❌ Permission denied. Your token needs 'quotes' permission.")
            print("   Please update your token permissions in Wise.")
        else:
            print(f"❌ Error getting quote: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing currency conversion: {str(e)}")

def test_supported_currencies(profile_id, headers):
    """Test other supported currencies"""
    print("\n" + "=" * 50)
    print("3. Testing other African currencies...")
    
    currencies = [
        ("NGN", "Nigeria"),
        ("GHS", "Ghana"),
        ("ZAR", "South Africa"),
        ("UGX", "Uganda"),
        ("TZS", "Tanzania")
    ]
    
    for currency, country in currencies:
        try:
            quote_data = {
                "source": "USD",
                "target": currency,
                "sourceAmount": 15.00,
                "rateType": "FIXED",
                "profile": profile_id
            }
            
            response = requests.post(
                f"{WISE_API_BASE}/v1/quotes",
                headers=headers,
                json=quote_data
            )
            
            if response.status_code == 200:
                quote = response.json()
                print(f"✅ {country} ({currency}): 1 USD = {quote['rate']} {currency}")
            else:
                print(f"❌ {country} ({currency}): Not available")
                
        except:
            pass

if __name__ == "__main__":
    print("Wise API Test Script")
    print("=" * 50)
    print(f"API Token: {WISE_API_TOKEN[:10]}...{WISE_API_TOKEN[-4:]}")
    
    test_wise_connection()
    
    print("\n" + "=" * 50)
    print("\nNEXT STEPS:")
    print("1. Copy the PROFILE ID shown above")
    print("2. Add these to your Render environment variables:")
    print(f"   WISE_API_TOKEN={WISE_API_TOKEN}")
    print("   WISE_PROFILE_ID=<the ID shown above>")
    print("3. Deploy and test with a Kenya VPN")