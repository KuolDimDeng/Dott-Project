
# hr/views.py

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Employee, Role, EmployeeRole, AccessPermission
from .serializers import EmployeeSerializer, RoleSerializer, EmployeeRoleSerializer, AccessPermissionSerializer
from django.shortcuts import get_object_or_404
from django.db.models import Q

from pyfactor.logging_config import get_logger

logger = get_logger()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_list(request):
    query = request.GET.get('q', '')
    employees = Employee.objects.filter(
        Q(first_name__icontains=query) | 
        Q(last_name__icontains=query) | 
        Q(employee_number__icontains=query)
    )
    serializer = EmployeeSerializer(employees, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_employee(request):
    serializer = EmployeeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_detail(request, pk):
    employee = get_object_or_404(Employee, pk=pk)

    if request.method == 'GET':
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = EmployeeSerializer(employee, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_employee(request, pk):
    employee = get_object_or_404(Employee, pk=pk)
    serializer = EmployeeSerializer(employee, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Employee updated successfully. Employee ID: {employee.id}")
        return Response(serializer.data)
    logger.error(f"Employee update failed. Errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_employee(request, pk):
    employee = get_object_or_404(Employee, pk=pk)
    employee.delete()
    logger.info(f"Employee deleted successfully. Employee ID: {pk}")
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def role_list(request):
    if request.method == 'GET':
        roles = Role.objects.all()
        serializer = RoleSerializer(roles, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = RoleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def role_detail(request, pk):
    role = get_object_or_404(Role, pk=pk)

    if request.method == 'GET':
        serializer = RoleSerializer(role)
        return Response(serializer.data)
    elif request.method == 'PUT':
        serializer = RoleSerializer(role, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# EmployeeRole views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def employee_role_list(request):
    if request.method == 'GET':
        employee_roles = EmployeeRole.objects.all()
        serializer = EmployeeRoleSerializer(employee_roles, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = EmployeeRoleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_role_detail(request, pk):
    employee_role = get_object_or_404(EmployeeRole, pk=pk)

    if request.method == 'GET':
        serializer = EmployeeRoleSerializer(employee_role)
        return Response(serializer.data)
    elif request.method == 'PUT':
        serializer = EmployeeRoleSerializer(employee_role, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        employee_role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# AccessPermission views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def access_permission_list(request):
    if request.method == 'GET':
        access_permissions = AccessPermission.objects.all()
        serializer = AccessPermissionSerializer(access_permissions, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = AccessPermissionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def access_permission_detail(request, pk):
    access_permission = get_object_or_404(AccessPermission, pk=pk)

    if request.method == 'GET':
        serializer = AccessPermissionSerializer(access_permission)
        return Response(serializer.data)
    elif request.method == 'PUT':
        serializer = AccessPermissionSerializer(access_permission, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        access_permission.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
