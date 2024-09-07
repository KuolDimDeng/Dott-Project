from rest_framework import serializers
from .models import Employee, PreboardingForm, Role, EmployeeRole, AccessPermission

class EmployeeSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'employee_number']
        extra_kwargs = {
            'security_number': {'write_only': True},
            'bank_account_number': {'write_only': True},
            'tax_id_number': {'write_only': True},
        }

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