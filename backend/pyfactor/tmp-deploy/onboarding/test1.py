import jwt
from django.test import TestCase
from django.conf import settings
from rest_framework.test import APIClient

class TokenValidationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.test_token = 'GENERATED_TOKEN_FROM_FRONTEND'  # Replace this with a token you generated

    def test_access_token_structure(self):
        """Ensure token has required structure and claims"""
        try:
            decoded_token = jwt.decode(
                self.test_token, 
                settings.SECRET_KEY, 
                algorithms=["HS256"]
            )
            # Replace 'expected_claim' with actual claims the backend expects
            expected_claims = ['user_id', 'exp', 'iat']  
            
            for claim in expected_claims:
                self.assertIn(claim, decoded_token)
                
            print("Token is valid with correct claims:", decoded_token)
        
        except jwt.ExpiredSignatureError:
            self.fail("Token has expired")
        
        except jwt.InvalidTokenError:
            self.fail("Token is invalid")

    def test_token_verification(self):
        """Test if backend can verify token using token endpoint"""
        response = self.client.post('/api/token/verify/', {'token': self.test_token})
        self.assertEqual(response.status_code, 200, "Token verification failed")

