# Secure Banking API Implementation for Django/Render
# This uses your existing infrastructure at $0 extra cost

"""
SECURE BANKING API VIEWS

Place this in your Django backend at:
/backend/pyfactor/banking/views.py

Features:
- CSV processing on server (not client)
- Automatic duplicate detection
- Audit logging for compliance
- Tenant isolation via RLS
- No sensitive data in responses
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
import csv
import io
import hashlib
from decimal import Decimal
from datetime import datetime

class BankTransactionViewSet(viewsets.ModelViewSet):
    """
    Secure bank transaction management
    All processing happens server-side with audit logging
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Automatic tenant filtering via TenantManager
        return BankTransaction.objects.all()
    
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def import_csv(self, request):
        """
        Secure CSV import with duplicate detection
        """
        # Create audit log entry
        audit_log = BankingAuditLog.objects.create(
            user=request.user,
            action='import_csv',
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            started_at=timezone.now()
        )
        
        try:
            # Validate file
            csv_file = request.FILES.get('file')
            if not csv_file:
                raise ValueError('No file provided')
            
            if csv_file.size > 10 * 1024 * 1024:  # 10MB limit
                raise ValueError('File too large (max 10MB)')
            
            # Parse CSV securely
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            imported = 0
            duplicates = 0
            errors = []
            
            # Get or create bank account
            account_id = request.data.get('account_id')
            if not account_id:
                # Create a default account
                account = BankAccount.objects.create(
                    account_name=request.data.get('account_name', 'Imported Account'),
                    bank_name=request.data.get('bank_name', 'Unknown'),
                    account_type='checking'
                )
            else:
                account = BankAccount.objects.get(id=account_id)
            
            # Process transactions
            import_batch = uuid.uuid4()
            
            for row in reader:
                try:
                    # Generate unique import ID to prevent duplicates
                    import_id = self.generate_import_id(
                        account.id,
                        row.get('date', ''),
                        row.get('description', ''),
                        row.get('amount', '')
                    )
                    
                    # Check for duplicate
                    if BankTransaction.objects.filter(import_id=import_id).exists():
                        duplicates += 1
                        continue
                    
                    # Create transaction
                    BankTransaction.objects.create(
                        account=account,
                        transaction_date=self.parse_date(row.get('date')),
                        description=self.sanitize_text(row.get('description', '')),
                        amount=Decimal(str(row.get('amount', 0))),
                        balance=Decimal(str(row.get('balance', 0))) if row.get('balance') else None,
                        category=row.get('category', 'Uncategorized'),
                        import_id=import_id,
                        import_batch=import_batch,
                        imported_by=request.user
                    )
                    imported += 1
                    
                except Exception as e:
                    errors.append(f"Row error: {str(e)}")
            
            # Update audit log
            audit_log.completed_at = timezone.now()
            audit_log.duration_ms = int((audit_log.completed_at - audit_log.started_at).total_seconds() * 1000)
            audit_log.affected_records = imported
            audit_log.status = 'success' if imported > 0 else 'failed'
            audit_log.details = {
                'imported': imported,
                'duplicates': duplicates,
                'errors': errors[:10]  # Limit error details
            }
            audit_log.save()
            
            return Response({
                'imported': imported,
                'duplicates': duplicates,
                'errors': len(errors),
                'account_id': str(account.id)
            })
            
        except Exception as e:
            # Log failure
            audit_log.completed_at = timezone.now()
            audit_log.status = 'failed'
            audit_log.error_message = str(e)
            audit_log.save()
            
            return Response(
                {'error': 'Import failed. Please check your file format.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def generate_import_id(self, account_id, date, description, amount):
        """Generate unique ID for duplicate detection"""
        data = f"{account_id}|{date}|{description}|{amount}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    def sanitize_text(self, text):
        """Remove potentially harmful content"""
        # Remove SQL injection attempts
        dangerous_patterns = ['DROP', 'DELETE', 'INSERT', 'UPDATE', '<script', 'javascript:']
        clean_text = text
        for pattern in dangerous_patterns:
            clean_text = clean_text.replace(pattern, '')
        return clean_text[:500]  # Limit length
    
    def parse_date(self, date_str):
        """Safely parse date from various formats"""
        formats = ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y']
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except:
                continue
        raise ValueError(f"Unable to parse date: {date_str}")
    
    def get_client_ip(self, request):
        """Get client IP for audit logging"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class BankingRuleViewSet(viewsets.ModelViewSet):
    """Manage banking categorization rules"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return BankingRule.objects.all()
    
    @action(detail=False, methods=['post'])
    def apply_rules(self, request):
        """Apply rules to uncategorized transactions"""
        rules = BankingRule.objects.filter(is_active=True)
        transactions = BankTransaction.objects.filter(
            category='Uncategorized'
        )
        
        categorized = 0
        for transaction in transactions:
            for rule in rules:
                if self.rule_matches(rule, transaction):
                    transaction.category = rule.category
                    transaction.tags = rule.tags
                    transaction.save()
                    
                    # Update rule usage
                    rule.times_used += 1
                    rule.last_used = timezone.now()
                    rule.save()
                    
                    categorized += 1
                    break
        
        return Response({'categorized': categorized})


# Next.js API Route (Proxy)
"""
Create this file at:
/frontend/pyfactor_next/src/app/api/banking/import/route.js

export async function POST(request) {
  try {
    const cookies = request.cookies;
    const sessionId = cookies.get('sid');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Forward to Django backend
    const formData = await request.formData();
    
    const response = await fetch(`${process.env.BACKEND_API_URL}/api/banking/import-csv/`, {
      method: 'POST',
      headers: {
        'Authorization': `Session ${sessionId.value}`,
      },
      body: formData
    });
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
"""