from rest_framework import serializers
from .models import Employee, Role, EmployeeRole, AccessPermission

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'

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