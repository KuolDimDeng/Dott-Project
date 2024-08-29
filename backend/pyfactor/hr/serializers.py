
# hr/serializers.py

from rest_framework import serializers
from .models import Employee, Role, EmployeeRole, AccessPermission

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class AccessPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessPermission
        fields = '__all__'

class EmployeeRoleSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)

    class Meta:
        model = EmployeeRole
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    roles = EmployeeRoleSerializer(source='employeerole_set', many=True, read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['id', 'employee_number']