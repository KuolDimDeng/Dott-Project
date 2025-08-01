# New Banking API Views V2 - Implementing required endpoints
from django.conf import settings
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q, Avg
from datetime import datetime, timedelta
from decimal import Decimal
import hashlib

from .models import PlaidItem, BankAccount, BankTransaction, BankingAuditLog
from .plaid_service import PlaidService
from django.contrib.contenttypes.models import ContentType
from pyfactor.logging_config import get_logger

# Initialize logger and plaid service
logger = get_logger()
plaid_service = PlaidService()


class SyncTransactionsView(APIView):
    """
    POST /api/banking/sync/transactions/ - Sync transactions from Plaid
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logger.debug("🎯 [SyncTransactionsView] === START ===")
        logger.debug(f"🎯 [SyncTransactionsView] User: {request.user.id}")
        logger.debug(f"🎯 [SyncTransactionsView] Request data: {request.data}")
        
        try:
            account_id = request.data.get('account_id')
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            logger.debug(f"🎯 [SyncTransactionsView] Params - account_id: {account_id}, start_date: {start_date}, end_date: {end_date}")
            
            # Get the user's Plaid item
            try:
                plaid_item = PlaidItem.objects.get(user=request.user)
                logger.debug(f"🎯 [SyncTransactionsView] Found Plaid item: {plaid_item.item_id}")
            except PlaidItem.DoesNotExist:
                logger.error("🎯 [SyncTransactionsView] No Plaid item found for user")
                return Response({
                    "success": False,
                    "data": {},
                    "message": "No bank account connected. Please connect a bank account first."
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Parse dates if provided
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"🎯 [SyncTransactionsView] Invalid start_date format: {start_date}")
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid start_date format. Use YYYY-MM-DD"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"🎯 [SyncTransactionsView] Invalid end_date format: {end_date}")
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid end_date format. Use YYYY-MM-DD"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Default to last 30 days if no dates provided
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).date()
            if not end_date:
                end_date = datetime.now().date()
            
            logger.debug(f"🎯 [SyncTransactionsView] Using date range: {start_date} to {end_date}")
            
            # Fetch transactions from Plaid
            try:
                plaid_transactions = plaid_service.get_transactions(
                    plaid_item.access_token, 
                    start_date, 
                    end_date
                )
                logger.debug(f"🎯 [SyncTransactionsView] Fetched {len(plaid_transactions)} transactions from Plaid")
            except Exception as e:
                logger.error(f"🎯 [SyncTransactionsView] Error fetching from Plaid: {str(e)}")
                return Response({
                    "success": False,
                    "data": {},
                    "message": f"Failed to fetch transactions from Plaid: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Get or create bank accounts and sync transactions
            synced_count = 0
            duplicate_count = 0
            error_count = 0
            
            with transaction.atomic():
                for plaid_tx in plaid_transactions:
                    try:
                        # Get or create bank account
                        bank_account, created = BankAccount.objects.get_or_create(
                            user=request.user,
                            defaults={
                                'bank_name': 'Connected Bank',
                                'account_number': plaid_tx['account_id'][-4:],  # Last 4 digits
                                'balance': 0,
                                'account_type': 'checking',
                                'integration_type': ContentType.objects.get_for_model(PlaidItem),
                                'integration_id': plaid_item.id
                            }
                        )
                        
                        if created:
                            logger.debug(f"🎯 [SyncTransactionsView] Created new bank account: {bank_account.id}")
                        
                        # Generate unique transaction ID for duplicate detection
                        import_id = hashlib.sha256(
                            f"{plaid_tx['transaction_id']}|{plaid_tx['account_id']}".encode()
                        ).hexdigest()
                        
                        # Check for duplicates
                        if BankTransaction.objects.filter(import_id=import_id).exists():
                            duplicate_count += 1
                            continue
                        
                        # Create transaction
                        amount = abs(float(plaid_tx['amount']))
                        transaction_type = 'DEBIT' if float(plaid_tx['amount']) > 0 else 'CREDIT'
                        
                        BankTransaction.objects.create(
                            account=bank_account,
                            amount=amount,
                            transaction_type=transaction_type,
                            description=plaid_tx['name'][:255],
                            date=datetime.strptime(plaid_tx['date'], '%Y-%m-%d').date(),
                            reference_number=plaid_tx['transaction_id'],
                            merchant_name=plaid_tx.get('merchant_name', '')[:255] if plaid_tx.get('merchant_name') else '',
                            category=plaid_tx['category'][0] if plaid_tx.get('category') else 'Uncategorized',
                            import_id=import_id,
                            imported_at=timezone.now(),
                            imported_by=request.user
                        )
                        
                        synced_count += 1
                        
                    except Exception as e:
                        logger.error(f"🎯 [SyncTransactionsView] Error processing transaction {plaid_tx.get('transaction_id', 'unknown')}: {str(e)}")
                        error_count += 1
            
            logger.debug(f"🎯 [SyncTransactionsView] Sync completed - synced: {synced_count}, duplicates: {duplicate_count}, errors: {error_count}")
            
            # Create audit log
            BankingAuditLog.objects.create(
                user=request.user,
                action='sync_transactions',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'synced_count': synced_count,
                    'duplicate_count': duplicate_count,
                    'error_count': error_count,
                    'date_range': f"{start_date} to {end_date}"
                },
                status='success',
                affected_records=synced_count,
                completed_at=timezone.now()
            )
            
            return Response({
                "success": True,
                "data": {
                    "synced_count": synced_count,
                    "duplicate_count": duplicate_count,
                    "error_count": error_count,
                    "date_range": {
                        "start_date": str(start_date),
                        "end_date": str(end_date)
                    }
                },
                "message": f"Successfully synced {synced_count} transactions"
            })
            
        except Exception as e:
            logger.error(f"🎯 [SyncTransactionsView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while syncing transactions"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR', '')


class BankingTransactionsView(APIView):
    """
    GET /api/banking/transactions/ - Retrieve transactions with filtering
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        logger.debug("🎯 [BankingTransactionsView] === START ===")
        logger.debug(f"🎯 [BankingTransactionsView] User: {request.user.id}")
        logger.debug(f"🎯 [BankingTransactionsView] Query params: {dict(request.query_params)}")
        
        try:
            # Get query parameters
            account_id = request.query_params.get('account_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            transaction_type = request.query_params.get('transaction_type')
            is_reconciled = request.query_params.get('is_reconciled')
            category = request.query_params.get('category')
            limit = request.query_params.get('limit', 100)
            offset = request.query_params.get('offset', 0)
            
            logger.debug(f"🎯 [BankingTransactionsView] Filters - account_id: {account_id}, start_date: {start_date}, end_date: {end_date}")
            
            # Start with base queryset for user's transactions
            queryset = BankTransaction.objects.filter(account__user=request.user)
            
            # Apply filters
            if account_id:
                try:
                    # Validate account belongs to user
                    account = BankAccount.objects.get(id=account_id, user=request.user)
                    queryset = queryset.filter(account=account)
                    logger.debug(f"🎯 [BankingTransactionsView] Filtered by account: {account_id}")
                except BankAccount.DoesNotExist:
                    logger.error(f"🎯 [BankingTransactionsView] Account not found or not owned by user: {account_id}")
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Bank account not found or access denied"
                    }, status=status.HTTP_404_NOT_FOUND)
            
            if start_date:
                try:
                    start_date_parsed = datetime.strptime(start_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(date__gte=start_date_parsed)
                    logger.debug(f"🎯 [BankingTransactionsView] Filtered by start_date: {start_date}")
                except ValueError:
                    logger.error(f"🎯 [BankingTransactionsView] Invalid start_date format: {start_date}")
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid start_date format. Use YYYY-MM-DD"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if end_date:
                try:
                    end_date_parsed = datetime.strptime(end_date, '%Y-%m-%d').date()
                    queryset = queryset.filter(date__lte=end_date_parsed)
                    logger.debug(f"🎯 [BankingTransactionsView] Filtered by end_date: {end_date}")
                except ValueError:
                    logger.error(f"🎯 [BankingTransactionsView] Invalid end_date format: {end_date}")
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid end_date format. Use YYYY-MM-DD"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if transaction_type and transaction_type.upper() in ['CREDIT', 'DEBIT']:
                queryset = queryset.filter(transaction_type=transaction_type.upper())
                logger.debug(f"🎯 [BankingTransactionsView] Filtered by transaction_type: {transaction_type}")
            
            if is_reconciled is not None:
                is_reconciled_bool = is_reconciled.lower() in ['true', '1', 'yes']
                queryset = queryset.filter(is_reconciled=is_reconciled_bool)
                logger.debug(f"🎯 [BankingTransactionsView] Filtered by is_reconciled: {is_reconciled_bool}")
            
            if category:
                queryset = queryset.filter(category__icontains=category)
                logger.debug(f"🎯 [BankingTransactionsView] Filtered by category: {category}")
            
            # Apply ordering (most recent first)
            queryset = queryset.order_by('-date', '-id')
            
            # Get total count before pagination
            total_count = queryset.count()
            logger.debug(f"🎯 [BankingTransactionsView] Total matching transactions: {total_count}")
            
            # Apply pagination
            try:
                limit = int(limit)
                offset = int(offset)
                limit = min(limit, 1000)  # Cap at 1000 transactions per request
                queryset = queryset[offset:offset + limit]
            except (ValueError, TypeError):
                logger.error(f"🎯 [BankingTransactionsView] Invalid pagination params - limit: {limit}, offset: {offset}")
                return Response({
                    "success": False,
                    "data": {},
                    "message": "Invalid pagination parameters"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Serialize transactions
            transactions = []
            for transaction in queryset:
                transactions.append({
                    'id': transaction.id,
                    'account_id': transaction.account.id,
                    'account_name': transaction.account.bank_name,
                    'amount': float(transaction.amount),
                    'transaction_type': transaction.transaction_type,
                    'description': transaction.description,
                    'date': transaction.date.strftime('%Y-%m-%d'),
                    'is_reconciled': transaction.is_reconciled,
                    'reference_number': transaction.reference_number,
                    'merchant_name': transaction.merchant_name,
                    'category': transaction.category,
                    'imported_at': transaction.imported_at.strftime('%Y-%m-%d %H:%M:%S') if transaction.imported_at else None
                })
            
            logger.debug(f"🎯 [BankingTransactionsView] Returning {len(transactions)} transactions")
            
            # Calculate summary statistics
            if transactions:
                total_credits = sum(t['amount'] for t in transactions if t['transaction_type'] == 'CREDIT')
                total_debits = sum(t['amount'] for t in transactions if t['transaction_type'] == 'DEBIT')
                net_change = total_credits - total_debits
            else:
                total_credits = total_debits = net_change = 0
            
            return Response({
                "success": True,
                "data": {
                    "transactions": transactions,
                    "pagination": {
                        "total_count": total_count,
                        "limit": limit,
                        "offset": offset,
                        "has_more": (offset + limit) < total_count
                    },
                    "summary": {
                        "total_credits": total_credits,
                        "total_debits": total_debits,
                        "net_change": net_change,
                        "transaction_count": len(transactions)
                    }
                },
                "message": f"Successfully retrieved {len(transactions)} transactions"
            })
            
        except Exception as e:
            logger.error(f"🎯 [BankingTransactionsView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while retrieving transactions"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BankingAccountsView(APIView):
    """
    GET /api/banking/accounts/ - List connected bank accounts
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        logger.debug("🎯 [BankingAccountsView] === START ===")
        logger.debug(f"🎯 [BankingAccountsView] User: {request.user.id}")
        
        try:
            # Get user's bank accounts
            accounts = BankAccount.objects.filter(user=request.user).select_related('integration_type')
            
            logger.debug(f"🎯 [BankingAccountsView] Found {accounts.count()} accounts")
            
            # Serialize accounts
            accounts_data = []
            for account in accounts:
                # Get recent transaction count
                recent_transactions = BankTransaction.objects.filter(
                    account=account,
                    date__gte=(datetime.now() - timedelta(days=30)).date()
                ).count()
                
                # Get last sync date
                last_transaction = BankTransaction.objects.filter(account=account).order_by('-imported_at').first()
                last_sync = last_transaction.imported_at if last_transaction and last_transaction.imported_at else account.last_synced
                
                accounts_data.append({
                    'id': account.id,
                    'bank_name': account.bank_name,
                    'account_number': account.account_number,
                    'account_type': account.account_type,
                    'purpose': account.purpose,
                    'balance': float(account.balance),
                    'last_synced': last_sync.strftime('%Y-%m-%d %H:%M:%S') if last_sync else None,
                    'integration_type': account.integration_type.model if account.integration_type else 'Unknown',
                    'recent_transactions_count': recent_transactions,
                    'created_at': account.created_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(account, 'created_at') and account.created_at else None
                })
            
            logger.debug(f"🎯 [BankingAccountsView] Returning {len(accounts_data)} accounts")
            
            return Response({
                "success": True,
                "data": {
                    "accounts": accounts_data,
                    "total_count": len(accounts_data)
                },
                "message": f"Successfully retrieved {len(accounts_data)} bank accounts"
            })
            
        except Exception as e:
            logger.error(f"🎯 [BankingAccountsView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while retrieving bank accounts"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReconciliationView(APIView):
    """
    POST /api/banking/reconciliation/ - Reconciliation operations
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logger.debug("🎯 [ReconciliationView] === START ===")
        logger.debug(f"🎯 [ReconciliationView] User: {request.user.id}")
        logger.debug(f"🎯 [ReconciliationView] Request data: {request.data}")
        
        try:
            account_id = request.data.get('account_id')
            transaction_ids = request.data.get('transaction_ids', [])
            reconcile_action = request.data.get('action', 'reconcile')  # 'reconcile' or 'unreconcile'
            statement_balance = request.data.get('statement_balance')
            statement_date = request.data.get('statement_date')
            
            logger.debug(f"🎯 [ReconciliationView] Action: {reconcile_action}, Account: {account_id}")
            
            if not account_id:
                return Response({
                    "success": False,
                    "data": {},
                    "message": "account_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate account belongs to user
            try:
                account = BankAccount.objects.get(id=account_id, user=request.user)
                logger.debug(f"🎯 [ReconciliationView] Found account: {account.bank_name}")
            except BankAccount.DoesNotExist:
                logger.error(f"🎯 [ReconciliationView] Account not found: {account_id}")
                return Response({
                    "success": False,
                    "data": {},
                    "message": "Bank account not found or access denied"
                }, status=status.HTTP_404_NOT_FOUND)
            
            reconciled_count = 0
            failed_count = 0
            
            with transaction.atomic():
                if reconcile_action == 'reconcile':
                    # Reconcile specified transactions
                    if transaction_ids:
                        transactions = BankTransaction.objects.filter(
                            id__in=transaction_ids,
                            account=account
                        )
                        reconciled_count = transactions.update(is_reconciled=True)
                        logger.debug(f"🎯 [ReconciliationView] Reconciled {reconciled_count} transactions")
                    
                elif reconcile_action == 'unreconcile':
                    # Unreconcile specified transactions
                    if transaction_ids:
                        transactions = BankTransaction.objects.filter(
                            id__in=transaction_ids,
                            account=account
                        )
                        reconciled_count = transactions.update(is_reconciled=False)
                        logger.debug(f"🎯 [ReconciliationView] Unreconciled {reconciled_count} transactions")
                
                elif reconcile_action == 'auto_reconcile':
                    # Auto-reconcile based on statement balance and date
                    if not statement_balance or not statement_date:
                        return Response({
                            "success": False,
                            "data": {},
                            "message": "statement_balance and statement_date required for auto reconciliation"
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Parse statement date
                    try:
                        statement_date_parsed = datetime.strptime(statement_date, '%Y-%m-%d').date()
                    except ValueError:
                        return Response({
                            "success": False,
                            "data": {},
                            "message": "Invalid statement_date format. Use YYYY-MM-DD"
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Find transactions up to statement date
                    transactions = BankTransaction.objects.filter(
                        account=account,
                        date__lte=statement_date_parsed,
                        is_reconciled=False
                    ).order_by('date')
                    
                    # Calculate running balance and auto-reconcile
                    current_balance = float(account.balance)
                    target_balance = float(statement_balance)
                    
                    for tx in transactions:
                        if tx.transaction_type == 'CREDIT':
                            current_balance += float(tx.amount)
                        else:
                            current_balance -= float(tx.amount)
                        
                        # If we've reached the target balance, reconcile this transaction
                        if abs(current_balance - target_balance) < 0.01:  # Within 1 cent
                            tx.is_reconciled = True
                            tx.save()
                            reconciled_count += 1
                            break
                
                else:
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid action. Use 'reconcile', 'unreconcile', or 'auto_reconcile'"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get reconciliation summary
            total_transactions = BankTransaction.objects.filter(account=account).count()
            reconciled_transactions = BankTransaction.objects.filter(account=account, is_reconciled=True).count()
            unreconciled_transactions = total_transactions - reconciled_transactions
            
            # Calculate reconciled balance
            reconciled_credits = BankTransaction.objects.filter(
                account=account, 
                is_reconciled=True, 
                transaction_type='CREDIT'
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            reconciled_debits = BankTransaction.objects.filter(
                account=account, 
                is_reconciled=True, 
                transaction_type='DEBIT'
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            reconciled_balance = float(reconciled_credits) - float(reconciled_debits)
            
            # Create audit log
            BankingAuditLog.objects.create(
                user=request.user,
                action='reconcile',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'action': reconcile_action,
                    'account_id': account_id,
                    'reconciled_count': reconciled_count,
                    'statement_balance': statement_balance,
                    'statement_date': statement_date
                },
                status='success',
                affected_records=reconciled_count,
                completed_at=timezone.now()
            )
            
            return Response({
                "success": True,
                "data": {
                    "reconciled_count": reconciled_count,
                    "failed_count": failed_count,
                    "summary": {
                        "total_transactions": total_transactions,
                        "reconciled_transactions": reconciled_transactions,
                        "unreconciled_transactions": unreconciled_transactions,
                        "reconciled_balance": reconciled_balance
                    }
                },
                "message": f"Successfully processed {reconciled_count} transactions"
            })
            
        except Exception as e:
            logger.error(f"🎯 [ReconciliationView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred during reconciliation"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR', '')


class CashFlowReportView(APIView):
    """
    GET /api/banking/cash-flow/ - Cash flow reports
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        logger.debug("🎯 [CashFlowReportView] === START ===")
        logger.debug(f"🎯 [CashFlowReportView] User: {request.user.id}")
        logger.debug(f"🎯 [CashFlowReportView] Query params: {dict(request.query_params)}")
        
        try:
            # Get query parameters
            account_id = request.query_params.get('account_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            period = request.query_params.get('period', 'month')  # 'day', 'week', 'month'
            
            # Default date range (last 3 months)
            if not start_date:
                start_date = (datetime.now() - timedelta(days=90)).date()
            else:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid start_date format. Use YYYY-MM-DD"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if not end_date:
                end_date = datetime.now().date()
            else:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid end_date format. Use YYYY-MM-DD"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.debug(f"🎯 [CashFlowReportView] Date range: {start_date} to {end_date}")
            
            # Base queryset
            queryset = BankTransaction.objects.filter(
                account__user=request.user,
                date__range=[start_date, end_date]
            )
            
            # Filter by account if specified
            if account_id:
                try:
                    account = BankAccount.objects.get(id=account_id, user=request.user)
                    queryset = queryset.filter(account=account)
                    logger.debug(f"🎯 [CashFlowReportView] Filtered by account: {account_id}")
                except BankAccount.DoesNotExist:
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Bank account not found or access denied"
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Calculate overall cash flow
            total_inflows = queryset.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
            total_outflows = queryset.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0
            net_cash_flow = float(total_inflows) - float(total_outflows)
            
            # Generate period-based cash flow data
            cash_flow_data = []
            current_date = start_date
            
            if period == 'day':
                delta = timedelta(days=1)
                date_format = '%Y-%m-%d'
            elif period == 'week':
                delta = timedelta(weeks=1)
                date_format = '%Y-W%U'  # Year-Week format
            else:  # month
                delta = timedelta(days=30)  # Approximate month
                date_format = '%Y-%m'
            
            while current_date <= end_date:
                period_end = min(current_date + delta - timedelta(days=1), end_date)
                
                period_transactions = queryset.filter(
                    date__range=[current_date, period_end]
                )
                
                period_inflows = period_transactions.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
                period_outflows = period_transactions.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0
                period_net = float(period_inflows) - float(period_outflows)
                
                cash_flow_data.append({
                    'period': current_date.strftime(date_format),
                    'start_date': current_date.strftime('%Y-%m-%d'),
                    'end_date': period_end.strftime('%Y-%m-%d'),
                    'inflows': float(period_inflows),
                    'outflows': float(period_outflows),
                    'net_flow': period_net,
                    'transaction_count': period_transactions.count()
                })
                
                current_date += delta
            
            # Category breakdown
            category_breakdown = {}
            categories = queryset.exclude(category__isnull=True).exclude(category='').values('category').distinct()
            
            for cat in categories:
                category = cat['category']
                cat_transactions = queryset.filter(category=category)
                cat_inflows = cat_transactions.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
                cat_outflows = cat_transactions.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0
                
                category_breakdown[category] = {
                    'inflows': float(cat_inflows),
                    'outflows': float(cat_outflows),
                    'net': float(cat_inflows) - float(cat_outflows),
                    'transaction_count': cat_transactions.count()
                }
            
            logger.debug(f"🎯 [CashFlowReportView] Generated {len(cash_flow_data)} periods")
            
            return Response({
                "success": True,
                "data": {
                    "summary": {
                        "total_inflows": float(total_inflows),
                        "total_outflows": float(total_outflows),
                        "net_cash_flow": net_cash_flow,
                        "period": period,
                        "date_range": {
                            "start_date": start_date.strftime('%Y-%m-%d'),
                            "end_date": end_date.strftime('%Y-%m-%d')
                        }
                    },
                    "cash_flow_data": cash_flow_data,
                    "category_breakdown": category_breakdown
                },
                "message": f"Successfully generated cash flow report for {len(cash_flow_data)} periods"
            })
            
        except Exception as e:
            logger.error(f"🎯 [CashFlowReportView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while generating cash flow report"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AccountBalancesView(APIView):
    """
    GET /api/banking/account-balances/ - Account balance reports
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        logger.debug("🎯 [AccountBalancesView] === START ===")
        logger.debug(f"🎯 [AccountBalancesView] User: {request.user.id}")
        
        try:
            # Get user's bank accounts
            accounts = BankAccount.objects.filter(user=request.user)
            
            logger.debug(f"🎯 [AccountBalancesView] Found {accounts.count()} accounts")
            
            account_balances = []
            total_balance = 0
            
            for account in accounts:
                # Current balance
                current_balance = float(account.balance)
                
                # Calculate available balance (current balance minus pending transactions)
                pending_debits = BankTransaction.objects.filter(
                    account=account,
                    transaction_type='DEBIT',
                    is_reconciled=False
                ).aggregate(Sum('amount'))['amount__sum'] or 0
                
                available_balance = current_balance - float(pending_debits)
                
                # Get recent transaction stats
                recent_transactions = BankTransaction.objects.filter(
                    account=account,
                    date__gte=(datetime.now() - timedelta(days=30)).date()
                )
                
                recent_inflows = recent_transactions.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
                recent_outflows = recent_transactions.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0
                
                # Calculate average daily balance over last 30 days
                daily_balances = []
                for i in range(30):
                    check_date = datetime.now().date() - timedelta(days=i)
                    daily_balance = account.get_balance_at_date(check_date)
                    daily_balances.append(float(daily_balance))
                
                avg_daily_balance = sum(daily_balances) / len(daily_balances) if daily_balances else current_balance
                
                account_data = {
                    'account_id': account.id,
                    'bank_name': account.bank_name,
                    'account_number': account.account_number,
                    'account_type': account.account_type,
                    'purpose': account.purpose,
                    'balances': {
                        'current_balance': current_balance,
                        'available_balance': available_balance,
                        'pending_debits': float(pending_debits),
                        'average_daily_balance_30d': avg_daily_balance
                    },
                    'recent_activity': {
                        'inflows_30d': float(recent_inflows),
                        'outflows_30d': float(recent_outflows),
                        'net_flow_30d': float(recent_inflows) - float(recent_outflows),
                        'transaction_count_30d': recent_transactions.count()
                    },
                    'last_synced': account.last_synced.strftime('%Y-%m-%d %H:%M:%S') if account.last_synced else None
                }
                
                account_balances.append(account_data)
                total_balance += current_balance
            
            # Calculate portfolio summary
            total_available = sum(acc['balances']['available_balance'] for acc in account_balances)
            total_pending = sum(acc['balances']['pending_debits'] for acc in account_balances)
            total_inflows_30d = sum(acc['recent_activity']['inflows_30d'] for acc in account_balances)
            total_outflows_30d = sum(acc['recent_activity']['outflows_30d'] for acc in account_balances)
            
            logger.debug(f"🎯 [AccountBalancesView] Total balance across {len(account_balances)} accounts: ${total_balance}")
            
            return Response({
                "success": True,
                "data": {
                    "account_balances": account_balances,
                    "portfolio_summary": {
                        "total_accounts": len(account_balances),
                        "total_current_balance": total_balance,
                        "total_available_balance": total_available,
                        "total_pending_debits": total_pending,
                        "total_inflows_30d": total_inflows_30d,
                        "total_outflows_30d": total_outflows_30d,
                        "net_flow_30d": total_inflows_30d - total_outflows_30d
                    }
                },
                "message": f"Successfully retrieved balances for {len(account_balances)} accounts"
            })
            
        except Exception as e:
            logger.error(f"🎯 [AccountBalancesView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while retrieving account balances"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MonthlyStatementsView(APIView):
    """
    GET /api/banking/monthly-statements/ - Monthly statements
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        logger.debug("🎯 [MonthlyStatementsView] === START ===")
        logger.debug(f"🎯 [MonthlyStatementsView] User: {request.user.id}")
        logger.debug(f"🎯 [MonthlyStatementsView] Query params: {dict(request.query_params)}")
        
        try:
            # Get query parameters
            account_id = request.query_params.get('account_id')
            year = request.query_params.get('year', datetime.now().year)
            month = request.query_params.get('month', datetime.now().month)
            
            try:
                year = int(year)
                month = int(month)
            except (ValueError, TypeError):
                return Response({
                    "success": False,
                    "data": {},
                    "message": "Invalid year or month parameter"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if month < 1 or month > 12:
                return Response({
                    "success": False,
                    "data": {},
                    "message": "Month must be between 1 and 12"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.debug(f"🎯 [MonthlyStatementsView] Generating statement for {year}-{month:02d}")
            
            # Calculate month date range
            from calendar import monthrange
            start_date = datetime(year, month, 1).date()
            days_in_month = monthrange(year, month)[1]
            end_date = datetime(year, month, days_in_month).date()
            
            # Base queryset
            queryset = BankTransaction.objects.filter(
                account__user=request.user,
                date__range=[start_date, end_date]
            )
            
            # Filter by account if specified
            account = None
            if account_id:
                try:
                    account = BankAccount.objects.get(id=account_id, user=request.user)
                    queryset = queryset.filter(account=account)
                    logger.debug(f"🎯 [MonthlyStatementsView] Filtered by account: {account_id}")
                except BankAccount.DoesNotExist:
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Bank account not found or access denied"
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Get transactions ordered by date
            transactions = queryset.order_by('date', 'id')
            
            # Calculate balances
            if account:
                opening_balance = account.get_balance_at_date(start_date - timedelta(days=1))
                closing_balance = account.get_balance_at_date(end_date)
            else:
                # For multiple accounts, calculate total balances
                accounts = BankAccount.objects.filter(user=request.user)
                opening_balance = sum(acc.get_balance_at_date(start_date - timedelta(days=1)) for acc in accounts)
                closing_balance = sum(acc.get_balance_at_date(end_date) for acc in accounts)
            
            # Serialize transactions
            transaction_data = []
            running_balance = float(opening_balance)
            
            for tx in transactions:
                if tx.transaction_type == 'CREDIT':
                    running_balance += float(tx.amount)
                else:
                    running_balance -= float(tx.amount)
                
                transaction_data.append({
                    'id': tx.id,
                    'date': tx.date.strftime('%Y-%m-%d'),
                    'description': tx.description,
                    'reference_number': tx.reference_number,
                    'merchant_name': tx.merchant_name,
                    'category': tx.category,
                    'amount': float(tx.amount),
                    'transaction_type': tx.transaction_type,
                    'running_balance': running_balance,
                    'is_reconciled': tx.is_reconciled,
                    'account_name': tx.account.bank_name if account_id else tx.account.bank_name
                })
            
            # Calculate summary statistics
            total_credits = queryset.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
            total_debits = queryset.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0
            transaction_count = queryset.count()
            
            # Category breakdown
            category_summary = {}
            categories = queryset.exclude(category__isnull=True).exclude(category='').values('category').distinct()
            
            for cat in categories:
                category = cat['category']
                cat_transactions = queryset.filter(category=category)
                cat_credits = cat_transactions.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
                cat_debits = cat_transactions.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0
                
                category_summary[category] = {
                    'credits': float(cat_credits),
                    'debits': float(cat_debits),
                    'net': float(cat_credits) - float(cat_debits),
                    'transaction_count': cat_transactions.count()
                }
            
            # Account information
            account_info = None
            if account:
                account_info = {
                    'account_id': account.id,
                    'bank_name': account.bank_name,
                    'account_number': account.account_number,
                    'account_type': account.account_type,
                    'purpose': account.purpose
                }
            
            logger.debug(f"🎯 [MonthlyStatementsView] Generated statement with {len(transaction_data)} transactions")
            
            return Response({
                "success": True,
                "data": {
                    "statement_info": {
                        "year": year,
                        "month": month,
                        "month_name": start_date.strftime('%B'),
                        "statement_period": {
                            "start_date": start_date.strftime('%Y-%m-%d'),
                            "end_date": end_date.strftime('%Y-%m-%d')
                        },
                        "account": account_info,
                        "generated_at": timezone.now().strftime('%Y-%m-%d %H:%M:%S')
                    },
                    "balance_summary": {
                        "opening_balance": float(opening_balance),
                        "closing_balance": float(closing_balance),
                        "net_change": float(closing_balance) - float(opening_balance)
                    },
                    "transaction_summary": {
                        "total_credits": float(total_credits),
                        "total_debits": float(total_debits),
                        "transaction_count": transaction_count,
                        "reconciled_count": queryset.filter(is_reconciled=True).count(),
                        "unreconciled_count": queryset.filter(is_reconciled=False).count()
                    },
                    "transactions": transaction_data,
                    "category_summary": category_summary
                },
                "message": f"Successfully generated monthly statement for {start_date.strftime('%B %Y')}"
            })
            
        except Exception as e:
            logger.error(f"🎯 [MonthlyStatementsView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while generating monthly statement"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)