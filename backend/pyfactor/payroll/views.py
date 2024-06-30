from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Timesheet, PayrollRun, PayrollTransaction, TaxForm
from .serializers import TimesheetSerializer, PayrollRunSerializer, PayrollTransactionSerializer, TaxFormSerializer

class TimesheetViewSet(viewsets.ModelViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer

class PayrollRunViewSet(viewsets.ModelViewSet):
    queryset = PayrollRun.objects.all()
    serializer_class = PayrollRunSerializer

class PayrollTransactionViewSet(viewsets.ModelViewSet):
    queryset = PayrollTransaction.objects.all()
    serializer_class = PayrollTransactionSerializer

class TaxFormViewSet(viewsets.ModelViewSet):
    queryset = TaxForm.objects.all()
    serializer_class = TaxFormSerializer