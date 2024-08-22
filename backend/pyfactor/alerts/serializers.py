from rest_framework import serializers
from .models import Alert, UserAlert

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'

class UserAlertSerializer(serializers.ModelSerializer):
    alert = AlertSerializer()

    class Meta:
        model = UserAlert
        fields = '__all__'