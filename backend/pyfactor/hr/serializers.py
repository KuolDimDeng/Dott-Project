# hr/serializers.py

from rest_framework import serializers
from .models import Employee, PreboardingForm, Role, EmployeeRole, AccessPermission
from decimal import Decimal, InvalidOperation
from datetime import datetime


class EmployeeSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    dob = serializers.DateField(input_formats=['%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%d'])
    date_joined = serializers.DateField(input_formats=['%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%d'])

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'employee_number']
        extra_kwargs = {
            'security_number': {'write_only': True},
            'bank_account_number': {'write_only': True},
            'tax_id_number': {'write_only': True},
        }
        
    def create(self, validated_data):
        employee = Employee.objects.create(**validated_data)
        return employee


    def to_internal_value(self, data):
        # Convert salary and wage_rate to Decimal if they're strings
        if 'salary' in data and isinstance(data['salary'], str):
            try:
                data['salary'] = Decimal(data['salary'])
            except InvalidOperation:
                raise serializers.ValidationError({'salary': 'Must be a valid number'})
        
        if 'wage_rate' in data and isinstance(data['wage_rate'], str) and data['wage_rate']:
            try:
                data['wage_rate'] = Decimal(data['wage_rate'])
            except InvalidOperation:
                raise serializers.ValidationError({'wage_rate': 'Must be a valid number'})

        return super().to_internal_value(data)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class EmployeeRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeRole
        fields = '__all__'

class AccessPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessPermission
        fields = '__all__'

class PreboardingFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreboardingForm
        fields = '__all__'