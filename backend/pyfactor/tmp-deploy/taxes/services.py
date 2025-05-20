# taxes/services.py
from decimal import Decimal
import logging
from .models import State, IncomeTaxRate, PayrollTaxFiling, TaxApiTransaction
from datetime import datetime

logger = logging.getLogger(__name__)

class TaxCalculationService:
    """Service for calculating taxes"""
    
    @staticmethod
    def calculate_state_tax(state_code, income, tax_year, filing_status='single'):
        """Calculate state income tax"""
        try:
            state = State.objects.get(code=state_code)
            tax_rates = IncomeTaxRate.objects.filter(
                state=state,
                tax_year=tax_year,
                filing_status=filing_status
            ).order_by('income_min')
            
            if not tax_rates.exists():
                logger.warning(f"No tax rates found for {state_code} in {tax_year}")
                return Decimal('0.00')
                
            # Flat rate calculation
            if tax_rates.first().is_flat_rate:
                return Decimal(income) * tax_rates.first().rate_value
                
            # Progressive tax calculation
            tax_amount = Decimal('0.00')
            remaining_income = Decimal(income)
            
            for rate in tax_rates:
                if rate.income_max is None:
                    # Highest bracket
                    taxable_in_bracket = max(Decimal('0.00'), remaining_income)
                else:
                    income_min = Decimal('0.00') if rate.income_min is None else Decimal(rate.income_min)
                    taxable_in_bracket = max(Decimal('0.00'), 
                                           min(remaining_income, Decimal(rate.income_max) - income_min))
                
                tax_amount += taxable_in_bracket * Decimal(rate.rate_value)
                remaining_income -= taxable_in_bracket
                
                if remaining_income <= Decimal('0.00'):
                    break
                    
            return tax_amount.quantize(Decimal('0.01'))
            
        except State.DoesNotExist:
            logger.error(f"State with code {state_code} not found")
            return Decimal('0.00')
        except Exception as e:
            logger.error(f"Error calculating state tax: {str(e)}")
            return Decimal('0.00')
    
    @staticmethod
    def calculate_federal_tax(income, filing_status='single', tax_year=datetime.now().year):
        """Calculate federal income tax"""
        # This is a simplified implementation
        # In a real app, you would implement the full IRS tax brackets
        if income <= 10000:
            return Decimal(income) * Decimal('0.10')
        elif income <= 50000:
            return Decimal('1000.00') + (Decimal(income) - Decimal('10000.00')) * Decimal('0.15')
        elif income <= 100000:
            return Decimal('7000.00') + (Decimal(income) - Decimal('50000.00')) * Decimal('0.20')
        else:
            return Decimal('17000.00') + (Decimal(income) - Decimal('100000.00')) * Decimal('0.30')
    
    @staticmethod
    def calculate_payroll_taxes(income):
        """Calculate FICA taxes (Social Security and Medicare)"""
        # Social Security (6.2% up to wage base)
        ss_wage_base = Decimal('160200.00')  # 2024 value - would need annual updates
        ss_tax = min(Decimal(income), ss_wage_base) * Decimal('0.062')
        
        # Medicare (1.45% on all wages + 0.9% for high earners)
        medicare_tax = Decimal(income) * Decimal('0.0145')
        if income > Decimal('200000.00'):
            medicare_tax += (Decimal(income) - Decimal('200000.00')) * Decimal('0.009')
            
        return {
            'social_security': ss_tax.quantize(Decimal('0.01')),
            'medicare': medicare_tax.quantize(Decimal('0.01')),
        }

class TaxFilingService:
    """Service for handling tax filings"""
    
    @staticmethod
    def create_tax_filings_for_payroll(payroll_run, business_id):
        """Create tax filings for all applicable states in a payroll run"""
        from payroll.models import PayrollTransaction
        
        # Get unique states from payroll transactions
        transactions = PayrollTransaction.objects.filter(payroll_run=payroll_run)
        state_codes = set(transactions.exclude(state_code__isnull=True)
                         .values_list('state_code', flat=True))
                         
        filings_created = []
        
        for state_code in state_codes:
            try:
                state = State.objects.get(code=state_code)
                
                # Aggregate wages and withholding for this state
                state_transactions = transactions.filter(state_code=state_code)
                total_wages = sum(t.gross_pay for t in state_transactions)
                total_withholding = sum(t.state_tax for t in state_transactions)
                
                # Determine submission method based on state settings
                submission_method = 'api' if state.full_service_enabled and state.e_file_supported else \
                                  'portal' if state.full_service_enabled else 'self_service'
                
                # Create filing record
                filing = PayrollTaxFiling.objects.create(
                    state=state,
                    business_id=business_id,
                    payroll_run=str(payroll_run.id),
                    filing_period_start=payroll_run.start_date,
                    filing_period_end=payroll_run.end_date,
                    total_wages=total_wages,
                    total_withholding=total_withholding,
                    submission_method=submission_method,
                    filing_status='preparation'
                )
                
                filings_created.append(filing)
                
            except State.DoesNotExist:
                logger.error(f"State with code {state_code} not found")
            except Exception as e:
                logger.error(f"Error creating tax filing for state {state_code}: {str(e)}")
                
        return filings_created
        
    @staticmethod
    def submit_filings_for_states(filings, auto_submit=False):
        """Process tax filings for selected states"""
        results = []
        
        for filing in filings:
            state = filing.state
            
            try:
                if not auto_submit:
                    # Just prepare the filing
                    filing.filing_status = 'pending'
                    filing.save()
                    results.append({
                        'id': filing.id,
                        'state': state.code,
                        'status': 'pending',
                        'message': 'Filing prepared for submission'
                    })
                    continue
                    
                # Auto-submit logic for supported states
                if state.full_service_enabled and state.e_file_supported:
                    # E-file supported - attempt API filing
                    result = TaxFilingService._submit_via_api(filing)
                    filing.filing_status = result.get('status', 'pending')
                    filing.confirmation_number = result.get('confirmation_number')
                    filing.notes = result.get('message', '')
                    filing.save()
                    
                    results.append({
                        'id': filing.id,
                        'state': state.code,
                        'status': filing.filing_status,
                        'message': filing.notes,
                        'confirmation': filing.confirmation_number
                    })
                elif state.full_service_enabled:
                    # Full service but manual filing required
                    filing.filing_status = 'pending'
                    filing.notes = 'Ready for manual filing through state portal'
                    filing.save()
                    
                    results.append({
                        'id': filing.id,
                        'state': state.code,
                        'status': 'pending',
                        'message': 'Ready for manual filing through state portal'
                    })
                else:
                    # Self-service state
                    filing.filing_status = 'preparation'
                    filing.notes = 'Prepared for self-service filing by client'
                    filing.save()
                    
                    results.append({
                        'id': filing.id,
                        'state': state.code,
                        'status': 'preparation',
                        'message': 'Documents prepared for self-service filing'
                    })
                    
            except Exception as e:
                logger.error(f"Error submitting filing for state {state.code}: {str(e)}")
                results.append({
                    'id': filing.id,
                    'state': state.code,
                    'status': 'failed',
                    'message': f"Error: {str(e)}"
                })
                
        return results
    
    @staticmethod
    def _submit_via_api(filing):
        """Submit filing via state API"""
        # This would be implemented based on the specific state's API
        # Here's a placeholder implementation
        state = filing.state
        
        try:
            import time
            start_time = time.time()
            
            # Mock API call - in reality, this would call the actual state API
            # response = requests.post(state.e_file_portal_url, json=payload)
            success = True
            response_data = {'confirmation': f"MOCK-{state.code}-{int(time.time())}"}
            status_code = 200
            
            # Record the API transaction
            TaxApiTransaction.objects.create(
                state=state,
                endpoint=f"{state.code}/efile",
                request_payload=f"Filing ID: {filing.id}, Amount: {filing.total_withholding}",
                response_payload=str(response_data),
                status_code=status_code,
                success=success,
                error_message="" if success else "Error message would go here",
                processing_time_ms=int((time.time() - start_time) * 1000)
            )
            
            if success:
                return {
                    'status': 'submitted',
                    'confirmation_number': response_data['confirmation'],
                    'message': 'Filing submitted successfully'
                }
            else:
                return {
                    'status': 'failed',
                    'message': 'Failed to submit filing'
                }
                
        except Exception as e:
            logger.error(f"API submission error for state {state.code}: {str(e)}")
            return {
                'status': 'failed',
                'message': f"Error: {str(e)}"
            }