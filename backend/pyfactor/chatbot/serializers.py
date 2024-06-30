# chatbot/serializers.py

from rest_framework import serializers
from .models import ChatMessage, FAQ

class ChatMessageSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'user_email', 'message', 'is_from_user', 'timestamp', 'needs_staff_attention', 'staff_response']
        read_only_fields = ['id', 'user_email', 'timestamp', 'needs_staff_attention', 'staff_response']

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'keywords']

class CreateChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['message']

class StaffResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['staff_response']