from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import BankAccount, Transaction
from .serializers import BankAccountSerializer, TransactionSerializer

class BankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        # This is where you'd implement the logic to sync with the bank
        # For now, we'll just return a placeholder message
        return Response({"message": "Sync initiated"})

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        return Transaction.objects.filter(account__user=self.request.user)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        transaction = self.get_object()
        transaction.is_reconciled = True
        transaction.save()
        return Response({"message": "Transaction reconciled"})