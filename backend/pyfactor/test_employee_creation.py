import requests
import json
from datetime import datetime

# Test employee creation endpoint
def test_employee_creation():
    # Base URL for your API
    base_url = "https://api.dottapps.com"
    
    # You'll need to get a valid session token from your browser
    # Open DevTools > Network > Look for any API call > Copy the session-token from cookies
    session_token = input("Please enter your session-token from browser cookies: ").strip()
    
    # Headers
    headers = {
        "Content-Type": "application/json",
        "Cookie": f"session-token={session_token}",
        "X-Tenant-ID": "8432ed61-16c8-4242-94fc-4c7e25ed5d07"  # Dott business ID
    }
    
    # Test employee data
    employee_data = {
        "firstName": "Test",
        "lastName": f"Employee-{datetime.now().strftime('%H%M%S')}",
        "email": f"test{datetime.now().strftime('%H%M%S')}@example.com",
        "phone": "555-0123",
        "dateOfBirth": "1990-01-01",
        "position": "Test Position",
        "department": "Engineering",
        "employmentType": "FT",
        "compensationType": "SALARY",
        "salary": "50000",
        "status": "active",
        "street": "123 Test St",
        "city": "Test City",
        "state": "CA",
        "zipCode": "12345",
        "country": "US"
    }
    
    print(f"\n🚀 Testing employee creation...")
    print(f"📝 Employee: {employee_data['firstName']} {employee_data['lastName']}")
    
    # Make the request
    try:
        response = requests.post(
            f"{base_url}/api/hr/employees/",
            headers=headers,
            json=employee_data
        )
        
        print(f"\n📊 Response Status: {response.status_code}")
        print(f"📄 Response Headers: {dict(response.headers)}")
        print(f"📦 Response Body: {response.text}")
        
        if response.status_code == 201:
            print("\n✅ Employee created successfully!")
            return response.json()
        else:
            print(f"\n❌ Failed to create employee")
            return None
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return None

if __name__ == "__main__":
    test_employee_creation()