#!/usr/bin/env python3
"""
Test marketplace API directly on staging
"""

import requests
import json

# Test marketplace API on staging - use the actual backend API endpoint
url = "https://api.dottapps.com/marketplace/consumer/businesses/"

# Test with parameters that mobile app is sending
params = {
    'city': 'Juba',
    'country': 'South Sudan',  # This is what the mobile app sends
    'page': 1,
    'page_size': 20
}

print(f"Testing marketplace API with params: {params}")
print(f"URL: {url}")

try:
    response = requests.get(url, params=params)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type', 'N/A')}")
    print(f"Content Length: {len(response.content)} bytes")

    # Show raw content if it's not JSON
    if response.content:
        # Try to parse as JSON
        try:
            data = response.json()
            print(f"\nParsed JSON:")
            print(f"Success: {data.get('success', 'N/A')}")
            print(f"Count: {data.get('count', 0)}")
            print(f"Number of results: {len(data.get('results', []))}")

            if data.get('results'):
                print("\nBusinesses found:")
                for business in data['results'][:3]:  # Show first 3
                    print(f"  - {business.get('businessName', 'No name')}")
                    print(f"    Type: {business.get('businessType', 'N/A')}")
                    print(f"    City: {business.get('city', 'N/A')}, Country: {business.get('country', 'N/A')}")
                    print(f"    ID: {business.get('id', 'N/A')}")
                    print()
            else:
                print("\nNo businesses found in results")

            # Show debug info if available
            if 'debug_info' in data:
                print(f"\nDebug info: {data['debug_info']}")
        except json.JSONDecodeError as e:
            print(f"Failed to parse as JSON: {e}")
            print(f"\nRaw response (first 500 chars):\n{response.text[:500]}")
    else:
        print("Response is empty")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

# Also test with country code directly
print("\n" + "="*50)
print("Testing with country code 'SS' directly:")
params['country'] = 'SS'
print(f"Params: {params}")

try:
    response = requests.get(url, params=params)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Content Length: {len(response.content)} bytes")

    if response.content:
        try:
            data = response.json()
            print(f"\nSuccess: {data.get('success', 'N/A')}")
            print(f"Count: {data.get('count', 0)}")
            print(f"Number of results: {len(data.get('results', []))}")

            if data.get('results'):
                print("\nBusinesses found:")
                for business in data['results'][:3]:
                    print(f"  - {business.get('businessName', 'No name')}")
            else:
                print("\nNo businesses found in results")
        except json.JSONDecodeError as e:
            print(f"Failed to parse as JSON: {e}")
            print(f"\nRaw response (first 500 chars):\n{response.text[:500]}")
    else:
        print("Response is empty")
except Exception as e:
    print(f"Error: {e}")