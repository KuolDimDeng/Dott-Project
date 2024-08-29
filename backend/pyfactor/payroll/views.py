from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Timesheet, PayrollRun, PayrollTransaction, TaxForm
from .serializers import TimesheetSerializer, PayrollRunSerializer, PayrollTransactionSerializer, TaxFormSerializer
from datetime import date

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