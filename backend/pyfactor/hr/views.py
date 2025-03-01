# hr/views.py

from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Employee, Role, EmployeeRole, AccessPermission, PreboardingForm
from .serializers import (
    EmployeeSerializer, 
    RoleSerializer, 
    EmployeeRoleSerializer, 
    AccessPermissionSerializer,
    PreboardingFormSerializer
)
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
    logger.info(f"Received employee data: {request.data}")
    
    # Get sensitive data before passing to serializer
    security_number = request.data.pop('security_number', None)
    bank_account_number = request.data.pop('bank_account_number', None)
    routing_number = request.data.pop('routing_number', None)
    
    serializer = EmployeeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        try:
            employee = serializer.save()
            
            # Handle sensitive data with Stripe Connect
            if security_number:
                try:
                    employee.save_ssn_to_stripe(security_number)
                    logger.info(f"SSN stored in Stripe for employee: {employee.id}")
                except Exception as e:
                    logger.error(f"Error storing SSN in Stripe: {str(e)}")
                    # Continue processing - we don't want to fail the entire creation
            
            if bank_account_number and routing_number:
                try:
                    employee.save_bank_account_to_stripe(bank_account_number, routing_number)
                    logger.info(f"Bank account stored in Stripe for employee: {employee.id}")
                except Exception as e:
                    logger.error(f"Error storing bank account in Stripe: {str(e)}")
            
            logger.info(f"Employee created successfully: {employee}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating employee: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    logger.error(f"Invalid data: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def employee_detail(request, pk):
    employee = get_object_or_404(Employee, pk=pk)

    if request.method == 'GET':
        serializer = EmployeeSerializer(employee)
        return Response(serializer.data)

    elif request.method == 'PUT':
        # Get sensitive data before passing to serializer
        security_number = request.data.pop('security_number', None)
        bank_account_number = request.data.pop('bank_account_number', None)
        routing_number = request.data.pop('routing_number', None)
        
        serializer = EmployeeSerializer(employee, data=request.data, partial=True)
        if serializer.is_valid():
            updated_employee = serializer.save()
            
            # Update sensitive data in Stripe if provided
            if security_number:
                try:
                    updated_employee.save_ssn_to_stripe(security_number)
                    logger.info(f"SSN updated in Stripe for employee: {updated_employee.id}")
                except Exception as e:
                    logger.error(f"Error updating SSN in Stripe: {str(e)}")
            
            if bank_account_number and routing_number:
                try:
                    updated_employee.save_bank_account_to_stripe(bank_account_number, routing_number)
                    logger.info(f"Bank account updated in Stripe for employee: {updated_employee.id}")
                except Exception as e:
                    logger.error(f"Error updating bank account in Stripe: {str(e)}")
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # You might want to add code to delete the Stripe person record as well
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_employee(request, pk):
    employee = get_object_or_404(Employee, pk=pk)
    
    # Get sensitive data before passing to serializer
    security_number = request.data.pop('security_number', None)
    bank_account_number = request.data.pop('bank_account_number', None)
    routing_number = request.data.pop('routing_number', None)
    
    serializer = EmployeeSerializer(employee, data=request.data, partial=True)
    if serializer.is_valid():
        updated_employee = serializer.save()
        
        # Update sensitive data in Stripe if provided
        if security_number:
            try:
                updated_employee.save_ssn_to_stripe(security_number)
                logger.info(f"SSN updated in Stripe for employee: {updated_employee.id}")
            except Exception as e:
                logger.error(f"Error updating SSN in Stripe: {str(e)}")
        
        if bank_account_number and routing_number:
            try:
                updated_employee.save_bank_account_to_stripe(bank_account_number, routing_number)
                logger.info(f"Bank account updated in Stripe for employee: {updated_employee.id}")
            except Exception as e:
                logger.error(f"Error updating bank account in Stripe: {str(e)}")
        
        logger.info(f"Employee updated successfully. Employee ID: {employee.id}")
        return Response(serializer.data)
    logger.error(f"Employee update failed. Errors: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_employee(request, pk):
    employee = get_object_or_404(Employee, pk=pk)
    
    # Optionally delete the Stripe person record if it exists
    if employee.stripe_person_id and employee.stripe_account_id:
        try:
            import stripe
            stripe.Account.delete_person(
                employee.stripe_account_id,
                employee.stripe_person_id
            )
            logger.info(f"Deleted Stripe person record for employee: {pk}")
        except Exception as e:
            logger.error(f"Error deleting Stripe person record: {str(e)}")
    
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

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def preboarding_form_list(request):
    if request.method == 'GET':
        preboarding_forms = PreboardingForm.objects.all()
        serializer = PreboardingFormSerializer(preboarding_forms, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = PreboardingFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def preboarding_form_detail(request, pk):
    preboarding_form = get_object_or_404(PreboardingForm, pk=pk)

    if request.method == 'GET':
        serializer = PreboardingFormSerializer(preboarding_form)
        return Response(serializer.data)
    elif request.method == 'PUT':
        serializer = PreboardingFormSerializer(preboarding_form, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        preboarding_form.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)