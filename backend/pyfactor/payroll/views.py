from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Timesheet, PayrollRun, PayrollTransaction, BankAccount
from .serializers import PayrollRunSerializer, PayrollTransactionSerializer
from datetime import date
from django.db.models import Sum, F

class RunPayrollView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            accounting_period = request.data.get('accounting_period')
            account_id = request.data.get('account_id')

            try:
                account = BankAccount.objects.get(id=account_id, plaid_item__user=request.user)
            except BankAccount.DoesNotExist:
                return Response({'error': 'Invalid account'}, status=status.HTTP_400_BAD_REQUEST)

            payroll_run = PayrollRun.objects.create(
                run_date=date.today(),
                start_date=start_date,
                end_date=end_date,
                accounting_period=accounting_period,
                bank_account=account,
                status='processing'
            )

            if accounting_period:
                year, month = map(int, accounting_period.split('-'))
                timesheets = Timesheet.objects.filter(
                    employee__company=request.user.company,
                    start_date__year=year,
                    start_date__month=month
                )
            else:
                timesheets = Timesheet.objects.filter(
                    employee__company=request.user.company,
                    start_date__gte=start_date,
                    end_date__lte=end_date
                )

            for timesheet in timesheets:
                gross_pay = timesheet.total_hours * timesheet.employee.hourly_rate
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

class PayrollRunsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payroll_runs = PayrollRun.objects.all().order_by('-run_date')
        serializer = PayrollRunSerializer(payroll_runs, many=True)
        return Response(serializer.data)

class PayrollTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, run_id):
        transactions = PayrollTransaction.objects.filter(payroll_run_id=run_id)
        serializer = PayrollTransactionSerializer(transactions, many=True)
        return Response(serializer.data)

class PayrollCalculationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        accounting_period = request.data.get('accounting_period')
        account_id = request.data.get('account_id')

        try:
            account = BankAccount.objects.get(id=account_id, plaid_item__user=request.user)
        except BankAccount.DoesNotExist:
            return Response({'error': 'Invalid account'}, status=status.HTTP_400_BAD_REQUEST)

        if accounting_period:
            year, month = map(int, accounting_period.split('-'))
            timesheets = Timesheet.objects.filter(
                employee__company=request.user.company,
                start_date__year=year,
                start_date__month=month
            )
        else:
            timesheets = Timesheet.objects.filter(
                employee__company=request.user.company,
                start_date__gte=start_date,
                end_date__lte=end_date
            )

        total_payroll = timesheets.aggregate(
            total=Sum(F('total_hours') * F('employee__hourly_rate'))
        )['total'] or 0

        return Response({
            'total_payroll': total_payroll,
            'account_name': account.name,
            'account_balance': account.current_balance,
            'period': accounting_period or f"{start_date} to {end_date}"
        })