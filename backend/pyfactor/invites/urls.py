from django.urls import path
from custom_auth.views.friend_invite_views import send_friend_invitation

app_name = 'invites'

urlpatterns = [
    path('send-friend/', send_friend_invitation, name='send-friend'),
]