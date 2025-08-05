from decimal import Decimal
from django.shortcuts import get_object_or_404, render
from psycopg2 import IntegrityError
from rest_framework import generics, status, serializers, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from finance.views import get_user_database
from .models import Bill, Expense, Procurement, PurchaseOrder, PurchaseReturn, Vendor
from finance.models import Account, AccountType, FinanceTransaction
from users.models import UserProfile
from .serializers import ExpenseSerializer, ProcurementSerializer, PurchaseOrderSerializer, PurchaseReturnSerializer, VendorSerializer, BillSerializer
from finance.serializers import TransactionSerializer
from django.conf import settings
from django.db import connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.user_console import console
from pyfactor.logging_config import get_logger
from sales.utils import get_or_create_account, ensure_date
from django.db import transaction as db_transaction 
from datetime import datetime, timedelta, date
from django.db.models import Q
from django.http import FileResponse
from django.core.mail import EmailMessage
from dateutil import parser
from django.core.exceptions import ObjectDoesNotExist
from sales.utils import get_or_create_user_database
import traceback
from decimal import Decimal
from rest_framework.exceptions import ValidationError



import uuid

logger = get_logger()
# Create your views here.



def ensure_database_exists(database_name):
    logger.debug("Creating dynamic database if it doesn't exist: %s", database_name)
    router = UserDatabaseRouter()
    router.create_dynamic_database(database_name)

def ensure_accounts_exist(database_name):
    logger.debug("Ensuring necessary accounts exist in database: %s", database_name)
    required_accounts = [
        ('Accounts Receivable', 'Accounts Receivable'),
        ('Sales Revenue', 'Sales Revenue'),
        ('Sales Tax Payable', 'Sales Tax Payable'),
        ('Cost of Goods Sold', 'Cost of Goods Sold'),
        ('Inventory', 'Inventory')
    ]
    for account_name, account_type_name in required_accounts:
        get_or_create_account(database_name, account_name, account_type_name)

def get_user_database(user):
    user_profile = UserProfile.objects.using('default').get(user=user)
    return user_profile.database_name

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_bill(request):
    logger.debug("Create Bill: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        database_name = get_user_database(user)
        logger.debug("Database name: %s", database_name)
        ensure_database_exists(database_name)
        logger.debug("Database exists.")
        ensure_accounts_exist(database_name)
        logger.debug("Accounts exist.")

        bill_data = request.data.copy()
        bill_data['vendor_id'] = bill_data.pop('vendor', None)  # Change 'vendor' to 'vendor_id'

        with db_transaction.atomic(using=database_name):
            serializer = BillSerializer(data=bill_data, context={'database_name': database_name})
            if serializer.is_valid():
                bill = serializer.save()
                logger.info(f"Bill created successfully. Bill ID: {bill.id}, Total Amount: {bill.totalAmount}")
                return Response({
                    'message': 'Bill created successfully',
                    'bill_id': str(bill.id),
                    'total_amount': str(bill.totalAmount)
                }, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Bill creation failed. Errors: {serializer.errors}")
                return Response({'error': 'Bill creation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception(f"Unexpected error in create_bill: {str(e)}")
        return Response({'error': 'An unexpected error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bill_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        bill = Bill.objects.using(database_name).select_related('vendor').prefetch_related('items').get(pk=pk)
    except Bill.DoesNotExist:
        return Response({'error': 'Bill not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = BillSerializer(bill, context={'database_name': database_name})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bill_list(request):
    user = request.user
    database_name = get_user_database(user)

    bills = Bill.objects.using(database_name).select_related('vendor').prefetch_related('items').all()
    serializer = BillSerializer(bills, many=True, context={'database_name': database_name})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_list(request):
    user = request.user
    database_name = get_user_database(user)

    vendors = Vendor.objects.using(database_name).all()
    serializer = VendorSerializer(vendors, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_vendor(request):
    user = request.user
    database_name = get_user_database(user)

    serializer = VendorSerializer(data=request.data, context={'database_name': database_name})
    if serializer.is_valid():
        with db_transaction.atomic(using=database_name):
            vendor = serializer.save()
        return Response(VendorSerializer(vendor).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        vendor = Vendor.objects.using(database_name).get(pk=pk)
    except Vendor.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    serializer = VendorSerializer(vendor)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_purchase_order(request):
    logger.debug("Create Purchase Order: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        database_name = get_user_database(user)
        logger.debug("Database name: %s", database_name)
        ensure_database_exists(database_name)
        logger.debug(f"Database {database_name} exists")
        ensure_accounts_exist(database_name)
        logger.debug("Accounts exist")

        with db_transaction.atomic(using=database_name):
            data = request.data
            data['date'] = ensure_date(data.get('date', timezone.now()))
            purchase_order = create_purchase_order_with_transaction(data, database_name)
            return Response(PurchaseOrderSerializer(purchase_order, context={'database_name': database_name}).data, status=status.HTTP_201_CREATED)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Unexpected error creating purchase order: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def create_purchase_order_with_transaction(data, database_name):
    logger.debug(f"Creating purchase order with transaction in database: {database_name}")
    logger.debug(f"Data received: {data}")

    purchase_order_serializer = PurchaseOrderSerializer(data=data, context={'database_name': database_name})

    if purchase_order_serializer.is_valid(raise_exception=True):
        purchase_order = purchase_order_serializer.save()
        logger.debug(f"Purchase order created: {purchase_order.order_number}")

        return purchase_order
    
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_purchase_orders(request):
    logger.debug("List Purchase Orders called")
    user = request.user

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)

        purchase_orders = PurchaseOrder.objects.using(database_name).all()
        serializer = PurchaseOrderSerializer(purchase_orders, many=True, context={'database_name': database_name})
        return Response(serializer.data)

    except Exception as e:
        logger.exception(f"Error fetching purchase orders: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def purchase_order_detail(request, pk):
    logger.debug(f"Purchase Order Detail called for purchase_order_id: {pk}")
    user = request.user

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)

        purchase_order = get_object_or_404(PurchaseOrder.objects.using(database_name).prefetch_related('items'), pk=pk)

        if request.method == 'GET':
            serializer = PurchaseOrderSerializer(purchase_order, context={'database_name': database_name})
            return Response(serializer.data)

        elif request.method == 'PUT':
            serializer = PurchaseOrderSerializer(purchase_order, data=request.data, context={'database_name': database_name})
            if serializer.is_valid():
                updated_purchase_order = serializer.save()
                return Response(PurchaseOrderSerializer(updated_purchase_order, context={'database_name': database_name}).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            purchase_order.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        logger.exception(f"Error processing purchase order detail: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_expense(request):
    user = request.user
    database_name = get_user_database(user)

    with db_transaction.atomic(using=database_name):
        serializer = ExpenseSerializer(data=request.data, context={'database_name': database_name})
        if serializer.is_valid():
            expense = serializer.save()
            
            # Create accounting entries
            accounts_payable = Account.objects.using(database_name).get(name='Accounts Payable')
            expense_account = Account.objects.using(database_name).get(name=expense.category)
            
            # Debit the expense account
            FinanceTransaction.objects.using(database_name).create(
                account=expense_account,
                amount=expense.amount,
                type='debit',
                description=f"Expense: {expense.description}"
            )
            
            # Credit accounts payable
            FinanceTransaction.objects.using(database_name).create(
                account=accounts_payable,
                amount=expense.amount,
                type='credit',
                description=f"Expense payable: {expense.description}"
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expense_list(request):
    user = request.user
    database_name = get_user_database(user)
    expenses = Expense.objects.using(database_name).all()
    serializer = ExpenseSerializer(expenses, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expense_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)
    try:
        expense = Expense.objects.using(database_name).get(pk=pk)
    except Expense.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    serializer = ExpenseSerializer(expense)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_purchase_return(request):
    logger.debug("Create Purchase Return: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        database_name = get_user_database(user)
        logger.debug("Database name: %s", database_name)
        ensure_database_exists(database_name)
        logger.debug("Database exists.")
        ensure_accounts_exist(database_name)
        logger.debug("Accounts exist.")

        with db_transaction.atomic(using=database_name):
            serializer = PurchaseReturnSerializer(data=request.data, context={'database_name': database_name})
            if serializer.is_valid():
                purchase_return = serializer.save()
                logger.info(f"Purchase return created successfully. Return ID: {purchase_return.id}")
                return Response({
                    'message': 'Purchase return created successfully',
                    'return_id': str(purchase_return.id),
                    'total_amount': str(purchase_return.total_amount)
                }, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Purchase return creation failed. Errors: {serializer.errors}")
                return Response({'error': 'Purchase return creation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception(f"Unexpected error in create_purchase_return: {str(e)}")
        return Response({'error': 'An unexpected error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def purchase_return_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        purchase_return = PurchaseReturn.objects.using(database_name).select_related('purchase_order').prefetch_related('items').get(pk=pk)
    except PurchaseReturn.DoesNotExist:
        return Response({'error': 'Purchase return not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PurchaseReturnSerializer(purchase_return, context={'database_name': database_name})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def purchase_return_list(request):
    user = request.user
    database_name = get_user_database(user)

    purchase_returns = PurchaseReturn.objects.using(database_name).select_related('purchase_order').prefetch_related('items').all()
    serializer = PurchaseReturnSerializer(purchase_returns, many=True, context={'database_name': database_name})
    return Response(serializer.data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_purchase_return(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        purchase_return = PurchaseReturn.objects.using(database_name).get(pk=pk)
    except PurchaseReturn.DoesNotExist:
        return Response({'error': 'Purchase return not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = PurchaseReturnSerializer(purchase_return, data=request.data, context={'database_name': database_name})
    if serializer.is_valid():
        updated_purchase_return = serializer.save()
        return Response(PurchaseReturnSerializer(updated_purchase_return, context={'database_name': database_name}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_purchase_return(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        purchase_return = PurchaseReturn.objects.using(database_name).get(pk=pk)
    except PurchaseReturn.DoesNotExist:
        return Response({'error': 'Purchase return not found'}, status=status.HTTP_404_NOT_FOUND)

    purchase_return.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_purchase_return(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        purchase_return = PurchaseReturn.objects.using(database_name).get(pk=pk)
    except PurchaseReturn.DoesNotExist:
        return Response({'error': 'Purchase return not found'}, status=status.HTTP_404_NOT_FOUND)

    if purchase_return.status != 'pending':
        return Response({'error': 'Only pending purchase returns can be approved'}, status=status.HTTP_400_BAD_REQUEST)

    purchase_return.status = 'approved'
    purchase_return.save()

    # Here you would add logic to update inventory and create necessary accounting entries

    return Response({'status': 'Purchase return approved'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_procurement(request):
    logger.debug("Create Procurement: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        database_name = get_user_database(user)
        logger.debug("Database name: %s", database_name)
        ensure_database_exists(database_name)
        ensure_accounts_exist(database_name)

        with db_transaction.atomic(using=database_name):
            serializer = ProcurementSerializer(data=request.data, context={'database_name': database_name})
            if serializer.is_valid():
                procurement = serializer.save()
                
                # Create accounting entries
                accounts_payable = Account.objects.using(database_name).get(name='Accounts Payable')
                inventory_account = Account.objects.using(database_name).get(name='Inventory')

                # Debit inventory account
                FinanceTransaction.objects.using(database_name).create(
                    account=inventory_account,
                    amount=procurement.total_amount,
                    type='debit',
                    description=f"Procurement: {procurement.procurement_number}"
                )

                # Credit accounts payable
                FinanceTransaction.objects.using(database_name).create(
                    account=accounts_payable,
                    amount=procurement.total_amount,
                    type='credit',
                    description=f"Procurement payable: {procurement.procurement_number}"
                )

                logger.info(f"Procurement created successfully. Procurement ID: {procurement.id}")
                return Response({
                    'message': 'Procurement created successfully',
                    'procurement_id': str(procurement.id),
                    'total_amount': str(procurement.total_amount)
                }, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Procurement creation failed. Errors: {serializer.errors}")
                return Response({'error': 'Procurement creation failed', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception(f"Unexpected error in create_procurement: {str(e)}")
        return Response({'error': 'An unexpected error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def procurement_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        procurement = Procurement.objects.using(database_name).select_related('vendor').prefetch_related('items').get(pk=pk)
    except Procurement.DoesNotExist:
        return Response({'error': 'Procurement not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProcurementSerializer(procurement, context={'database_name': database_name})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def procurement_list(request):
    user = request.user
    database_name = get_user_database(user)

    procurements = Procurement.objects.using(database_name).select_related('vendor').prefetch_related('items').all()
    serializer = ProcurementSerializer(procurements, many=True, context={'database_name': database_name})
    return Response(serializer.data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_vendor(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        vendor = Vendor.objects.using(database_name).get(pk=pk)
        vendor_name = vendor.vendor_name
        vendor.delete()
        logger.info(f"Vendor {vendor_name} deleted by user {user.email}")
        return Response({'message': f'Vendor {vendor_name} deleted successfully'}, status=status.HTTP_200_OK)
    except Vendor.DoesNotExist:
        return Response({'error': 'Vendor not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error deleting vendor: {str(e)}")
        return Response({'error': 'Failed to delete vendor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_vendor_status(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        vendor = Vendor.objects.using(database_name).get(pk=pk)
        vendor.is_active = not vendor.is_active
        vendor.save()
        
        status_text = "activated" if vendor.is_active else "deactivated"
        logger.info(f"Vendor {vendor.vendor_name} {status_text} by user {user.email}")
        
        return Response({
            'message': f'Vendor {vendor.vendor_name} {status_text} successfully',
            'is_active': vendor.is_active
        }, status=status.HTTP_200_OK)
    except Vendor.DoesNotExist:
        return Response({'error': 'Vendor not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error toggling vendor status: {str(e)}")
        return Response({'error': 'Failed to update vendor status'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


