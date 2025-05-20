# payroll/services.py

from payments.providers import PaymentProviderRegistry

class PayrollService:
    """Service for processing payroll payments"""
    
    @staticmethod
    def process_payments(payroll_run, user):
        """Process payments for a payroll run"""
        transactions = PayrollTransaction.objects.filter(payroll_run=payroll_run)
        results = []
        
        for transaction in transactions:
            employee = transaction.employee
            
            # Get appropriate payment provider for this employee's country
            country_code = employee.country or payroll_run.country_code or 'US'
            provider = PaymentProviderRegistry.get_provider_for_country(country_code)
            
            # Process payment
            result = provider.process_payroll_payment(
                employee=employee,
                amount=transaction.net_pay,
                currency=payroll_run.currency_code,
                metadata={
                    'payroll_id': str(payroll_run.id),
                    'transaction_id': str(transaction.id),
                    'company_id': str(user.company.id),
                    'description': f"Salary payment for {payroll_run.start_date} to {payroll_run.end_date}"
                }
            )
            
            # Record payment result
            transaction.payment_status = 'success' if result['success'] else 'failed'
            transaction.payment_provider = result['provider']
            transaction.payment_transaction_id = result.get('transaction_id', '')
            transaction.payment_error = result.get('error', '')
            transaction.save()
            
            results.append({
                'employee_id': str(employee.id),
                'amount': transaction.net_pay,
                'currency': payroll_run.currency_code,
                'success': result['success'],
                'provider': result['provider'],
                'error': result.get('error', '')
            })
            
        return results