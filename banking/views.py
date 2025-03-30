from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import BankAccount, BankTransaction
from .serializers import BankAccountSerializer, BankTransactionSerializer
from custom_auth.decorators import tenant_context, admin_or_tenant_required
from custom_auth.tenant_context import TenantContextManager

class BankAccountListView(APIView):
    permission_classes = [IsAuthenticated]
    
    @tenant_context
    def get(self, request):
        """
        Get list of bank accounts for the current tenant.
        """
        # The tenant_context decorator handles setting the tenant context
        # The TenantAwareManager on BankAccount will automatically filter by tenant_id
        accounts = BankAccount.objects.all()
        serializer = BankAccountSerializer(accounts, many=True)
        return Response(serializer.data)
    
    @tenant_context
    def post(self, request):
        """
        Create a bank account for the current tenant.
        """
        serializer = BankAccountSerializer(data=request.data)
        if serializer.is_valid():
            # The tenant_id will be set automatically in the model's save method
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
class BankAccountDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        """
        Get a bank account by ID.
        RLS ensures this will only return accounts for the current tenant.
        """
        try:
            return BankAccount.objects.get(pk=pk)
        except BankAccount.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound(f"Bank account with ID {pk} not found")
    
    @tenant_context
    def get(self, request, pk):
        """
        Get a specific bank account for the current tenant.
        """
        account = self.get_object(pk)
        serializer = BankAccountSerializer(account)
        return Response(serializer.data)
    
    @tenant_context
    def put(self, request, pk):
        """
        Update a bank account for the current tenant.
        """
        account = self.get_object(pk)
        serializer = BankAccountSerializer(account, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @tenant_context
    def delete(self, request, pk):
        """
        Delete a bank account for the current tenant.
        """
        account = self.get_object(pk)
        account.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
        
class BankTransactionListView(APIView):
    permission_classes = [IsAuthenticated]
    
    @tenant_context
    def get(self, request, account_id=None):
        """
        Get list of bank transactions, optionally filtered by account.
        """
        if account_id:
            transactions = BankTransaction.objects.filter(account_id=account_id)
        else:
            transactions = BankTransaction.objects.all()
            
        serializer = BankTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @tenant_context
    def post(self, request, account_id=None):
        """
        Create a bank transaction, optionally for a specific account.
        """
        # If account_id is provided in the URL, use it
        if account_id:
            request.data['account'] = account_id
            
        serializer = BankTransactionSerializer(data=request.data)
        if serializer.is_valid():
            # The tenant_id will be set automatically in the model's save method
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
class AdminBankAccountView(APIView):
    """
    Admin-only view for accessing all bank accounts across tenants.
    """
    permission_classes = [IsAuthenticated]
    
    @admin_or_tenant_required
    def get(self, request):
        """
        Get all bank accounts, or just accounts for the current tenant if not admin.
        """
        if request.user.is_staff:
            # For admin users, show all accounts across tenants
            accounts = BankAccount.all_objects.all()
        else:
            # For regular users, just show their tenant's accounts
            accounts = BankAccount.objects.all()
            
        serializer = BankAccountSerializer(accounts, many=True)
        return Response(serializer.data) 