from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Timesheet, PayrollRun, PayrollTransaction, TaxForm
from .serializers import TimesheetSerializer, PayrollRunSerializer, PayrollTransactionSerializer, TaxFormSerializer
from datetime import date
from .models import Employee, Role, EmployeeRole, AccessPermission, PreboardingForm
from .serializers import EmployeeSerializer, RoleSerializer, EmployeeRoleSerializer, AccessPermissionSerializer, PreboardingFormSerializer
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.conf import settings
from django.core.mail import send_mail


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
    
@api_view(['POST'])
def create_preboarding_form(request):
    serializer = PreboardingFormSerializer(data=request.data)
    if serializer.is_valid():
        preboarding_form = serializer.save()
        # Send email to new hire
        send_preboarding_email(preboarding_form)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def submit_new_hire_info(request):
    email = request.data.get('email')
    preboarding_form = PreboardingForm.objects.get(email=email)
    employee_serializer = EmployeeSerializer(data=request.data)
    if employee_serializer.is_valid():
        employee = employee_serializer.save(onboarded=False)
        preboarding_form.verified = False
        preboarding_form.save()
        # Send email to staff for verification
        send_verification_email(employee, preboarding_form)
        return Response(employee_serializer.data, status=status.HTTP_201_CREATED)
    return Response(employee_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def verify_and_onboard(request, employee_id):
    employee = Employee.objects.get(id=employee_id)
    employee.onboarded = True
    employee.save()
    # Send confirmation email to new hire
    send_onboarding_confirmation_email(employee)
    return Response({'status': 'Employee onboarded successfully'}, status=status.HTTP_200_OK)

def send_preboarding_email(preboarding_form):
    subject = 'Complete your preboarding information'
    message = f'Hi {preboarding_form.first_name},\n\nPlease complete your preboarding information by clicking the following link: {settings.FRONTEND_URL}/preboarding/{preboarding_form.id}\n\nBest regards,\nHR Team'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [preboarding_form.email])

def send_verification_email(employee, preboarding_form):
    subject = 'New hire information submitted for verification'
    message = f'A new hire has submitted their information. Please verify and onboard.\n\nName: {employee.first_name} {employee.last_name}\nPosition: {preboarding_form.position}\n\nVerify at: {settings.FRONTEND_URL}/verify-employee/{employee.id}'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [settings.HR_EMAIL])

def send_onboarding_confirmation_email(employee):
    subject = 'Your information has been received'
    message = f'Hi {employee.first_name},\n\nYour information has been received and processed. We will get back to you soon with further details.\n\nBest regards,\nHR Team'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [employee.email])
    
    
@api_view(['GET', 'POST'])
def preboarding_form_list(request):
    if request.method == 'GET':
        forms = PreboardingForm.objects.all()
        serializer = PreboardingFormSerializer(forms, many=True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = PreboardingFormSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_payroll(request):
    try:
        # Create a new payroll run
        payroll_run = PayrollRun.objects.create(
            run_date=date.today(),
            start_date=request.data.get('start_date'),
            end_date=request.data.get('end_date'),
            status='processing'
        )

        # Process timesheets and create payroll transactions
        timesheets = Timesheet.objects.filter(date__range=[payroll_run.start_date, payroll_run.end_date])
        for timesheet in timesheets:
            # Calculate pay (simplified example)
            gross_pay = timesheet.hours_worked * timesheet.employee.hourly_rate
            taxes = gross_pay * 0.2  # Simplified tax calculation
            net_pay = gross_pay - taxes

            PayrollTransaction.objects.create(
                employee=timesheet.employee,
                payroll_run=payroll_run,
                gross_pay=gross_pay,
                net_pay=net_pay,
                taxes=taxes
            )

        payroll_run.status = 'completed'
        payroll_run.save()

        return Response({'message': 'Payroll run completed successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_runs(request):
    payroll_runs = PayrollRun.objects.all().order_by('-run_date')
    serializer = PayrollRunSerializer(payroll_runs, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payroll_transactions(request, run_id):
    transactions = PayrollTransaction.objects.filter(payroll_run_id=run_id)
    serializer = PayrollTransactionSerializer(transactions, many=True)
    return Response(serializer.data)