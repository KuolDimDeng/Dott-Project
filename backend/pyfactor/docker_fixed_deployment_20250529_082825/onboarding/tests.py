# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/tests.py
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User

@pytest.fixture
def create_user(db):
    """Fixture to create a user for testing."""
    user = User.objects.create_user(
        email='testuser@example.com',
        password='testpassword',
        is_active=True
    )
    return user

@pytest.mark.django_db
def test_token_obtain_pair(client, create_user):
    """Test obtaining a token pair."""
    url = reverse('token_obtain_pair')
    response = client.post(url, {
        'email': 'testuser@example.com',
        'password': 'testpassword'
    })

    assert response.status_code == status.HTTP_200_OK
    assert 'refresh' in response.data
    assert 'access' in response.data

@pytest.mark.django_db
def test_token_refresh(client, create_user):
    """Test refreshing a token."""
    refresh = RefreshToken.for_user(create_user)

    url = reverse('token_refresh')
    response = client.post(url, {'refresh': str(refresh)})

    assert response.status_code == status.HTTP_200_OK
    assert 'access' in response.data
    assert response.data['access'] != str(refresh.access_token)

@pytest.mark.django_db
def test_token_refresh_invalid(client, create_user):
    """Test refreshing a token with an invalid refresh token."""
    url = reverse('token_refresh')
    response = client.post(url, {'refresh': 'invalidtoken'})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.django_db
def test_social_login(client):
    """Test social login handling (this example is simplified)."""
    url = reverse('social_login')
    response = client.post(url, {
        'provider': 'google',
        'access_token': 'valid_access_token',
        'id_token': 'valid_id_token'
    })

    assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
