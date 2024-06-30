from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Employee, Role, EmployeeRole, AccessPermission
from .serializers import EmployeeSerializer, RoleSerializer, EmployeeRoleSerializer, AccessPermissionSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

class EmployeeRoleViewSet(viewsets.ModelViewSet):
    queryset = EmployeeRole.objects.all()
    serializer_class = EmployeeRoleSerializer

class AccessPermissionViewSet(viewsets.ModelViewSet):
    queryset = AccessPermission.objects.all()
    serializer_class = AccessPermissionSerializer