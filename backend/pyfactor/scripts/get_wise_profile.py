#!/usr/bin/env python3
"""
Script to get Wise profile ID using the API token
Run this to get your profile ID for the sandbox environment
"""
import requests
import json

# Your Wise sandbox API token
API_TOKEN = "0a02fd2e-e7e5-4fc2-a7d8-036b5b407a1a"
BASE_URL = "https://api.sandbox.wise.com"

def get_profiles():
    """Fetch all profiles associated with the API token"""
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        # Get profiles
        response = requests.get(f"{BASE_URL}/v2/profiles", headers=headers)
        response.raise_for_status()
        
        profiles = response.json()
        
        if not profiles:
            print("No profiles found. You may need to create one first.")
            return None
            
        print(f"Found {len(profiles)} profile(s):\n")
        
        for profile in profiles:
            print(f"Profile ID: {profile['id']}")
            print(f"Type: {profile['type']}")
            print(f"Full Name: {profile.get('details', {}).get('name', 'N/A')}")
            if profile['type'] == 'business':
                print(f"Business Name: {profile.get('details', {}).get('name', 'N/A')}")
            print("-" * 40)
            
        # Return the first profile ID (usually what you want)
        return profiles[0]['id']
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching profiles: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response: {e.response.text}")
        return None

def create_profile():
    """Create a new personal profile if none exists"""
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Create a personal profile
    profile_data = {
        "type": "personal",
        "details": {
            "firstName": "Dott",
            "lastName": "Test",
            "dateOfBirth": "1990-01-01",
            "phoneNumber": "+14155552671"
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/v2/profiles", headers=headers, json=profile_data)
        response.raise_for_status()
        
        profile = response.json()
        print(f"Created new profile with ID: {profile['id']}")
        return profile['id']
        
    except requests.exceptions.RequestException as e:
        print(f"Error creating profile: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response: {e.response.text}")
        return None

if __name__ == "__main__":
    print("Fetching Wise profiles for sandbox environment...")
    print("=" * 50)
    
    profile_id = get_profiles()
    
    if not profile_id:
        print("\nNo profiles found. Would you like to create one? (y/n): ", end="")
        if input().lower() == 'y':
            profile_id = create_profile()
    
    if profile_id:
        print(f"\n{'=' * 50}")
        print(f"YOUR WISE_PROFILE_ID: {profile_id}")
        print(f"{'=' * 50}")
        print("\nAdd this to your Render environment variables:")
        print(f"WISE_PROFILE_ID={profile_id}")