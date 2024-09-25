def get_reconciliation_summary(account, end_date):
    outstanding_checks = BankTransaction.objects.filter(
        account=account,
        transaction_type='DEBIT',
        is_reconciled=False,
        date__lte=end_date
    ).aggregate(Sum('amount'))['amount__sum'] or 0

    deposits_in_transit = BankTransaction.objects.filter(
        account=account,
        transaction_type='CREDIT',
        is_reconciled=False,
        date__lte=end_date
    ).aggregate(Sum('amount'))['amount__sum'] or 0

    return {
        'outstanding_checks': float(outstanding_checks),
        'deposits_in_transit': float(deposits_in_transit)
    }