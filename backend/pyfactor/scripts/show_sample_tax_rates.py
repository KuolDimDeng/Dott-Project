#!/usr/bin/env python
"""
Display sample tax rates that Claude would return for various countries
This shows what the system would look like when populated
"""

# Sample tax rates data (simulating Claude AI responses)
SAMPLE_TAX_RATES = [
    {
        'country': 'United States',
        'code': 'US',
        'tax_type': 'Sales Tax',
        'rate': '0%',
        'notes': 'No federal sales tax; state rates vary 0-10.25%'
    },
    {
        'country': 'Canada',
        'code': 'CA',
        'tax_type': 'GST',
        'rate': '5%',
        'notes': 'Federal GST 5% + provincial PST/HST 0-10%'
    },
    {
        'country': 'United Kingdom',
        'code': 'GB',
        'tax_type': 'VAT',
        'rate': '20%',
        'notes': 'Standard rate 20%, reduced 5%, zero-rated items'
    },
    {
        'country': 'Germany',
        'code': 'DE',
        'tax_type': 'VAT',
        'rate': '19%',
        'notes': 'Standard 19%, reduced 7% for food/books'
    },
    {
        'country': 'France',
        'code': 'FR',
        'tax_type': 'VAT',
        'rate': '20%',
        'notes': 'Standard 20%, reduced rates 10%, 5.5%, 2.1%'
    },
    {
        'country': 'Japan',
        'code': 'JP',
        'tax_type': 'Consumption Tax',
        'rate': '10%',
        'notes': 'Standard 10%, reduced 8% for food/newspapers'
    },
    {
        'country': 'Australia',
        'code': 'AU',
        'tax_type': 'GST',
        'rate': '10%',
        'notes': 'GST 10% on most goods and services'
    },
    {
        'country': 'New Zealand',
        'code': 'NZ',
        'tax_type': 'GST',
        'rate': '15%',
        'notes': 'GST 15% on most goods and services'
    },
    {
        'country': 'India',
        'code': 'IN',
        'tax_type': 'GST',
        'rate': '18%',
        'notes': 'Multiple rates: 0%, 5%, 12%, 18%, 28%'
    },
    {
        'country': 'China',
        'code': 'CN',
        'tax_type': 'VAT',
        'rate': '13%',
        'notes': 'Standard 13%, reduced 9% and 6%'
    },
    {
        'country': 'Brazil',
        'code': 'BR',
        'tax_type': 'ICMS',
        'rate': '17%',
        'notes': 'State tax varies 17-19% average'
    },
    {
        'country': 'Mexico',
        'code': 'MX',
        'tax_type': 'IVA',
        'rate': '16%',
        'notes': 'IVA 16%, border regions 8%, essentials 0%'
    },
    {
        'country': 'South Africa',
        'code': 'ZA',
        'tax_type': 'VAT',
        'rate': '15%',
        'notes': 'VAT 15%, zero-rated basic foods'
    },
    {
        'country': 'UAE',
        'code': 'AE',
        'tax_type': 'VAT',
        'rate': '5%',
        'notes': 'VAT 5% since 2018'
    },
    {
        'country': 'Singapore',
        'code': 'SG',
        'tax_type': 'GST',
        'rate': '9%',
        'notes': 'GST 9% as of 2024'
    },
    {
        'country': 'Kenya',
        'code': 'KE',
        'tax_type': 'VAT',
        'rate': '16%',
        'notes': 'VAT 16%, zero-rated exports'
    },
    {
        'country': 'Nigeria',
        'code': 'NG',
        'tax_type': 'VAT',
        'rate': '7.5%',
        'notes': 'VAT 7.5% standard rate'
    },
    {
        'country': 'Egypt',
        'code': 'EG',
        'tax_type': 'VAT',
        'rate': '14%',
        'notes': 'VAT 14% standard rate'
    },
    {
        'country': 'Saudi Arabia',
        'code': 'SA',
        'tax_type': 'VAT',
        'rate': '15%',
        'notes': 'VAT 15% (increased from 5% in 2020)'
    },
    {
        'country': 'Israel',
        'code': 'IL',
        'tax_type': 'VAT',
        'rate': '17%',
        'notes': 'VAT 17% standard rate'
    },
]

def main():
    print("="*80)
    print("GLOBAL SALES TAX RATES - Claude AI Results")
    print("="*80)
    print(f"{'Country':<20} {'Code':<6} {'Tax Type':<15} {'Rate':<8} {'Notes'}")
    print("-"*80)
    
    # Sort by tax rate (for display purposes)
    sorted_rates = sorted(SAMPLE_TAX_RATES, key=lambda x: float(x['rate'].rstrip('%')))
    
    for rate in sorted_rates:
        print(f"{rate['country']:<20} {rate['code']:<6} {rate['tax_type']:<15} "
              f"{rate['rate']:<8} {rate['notes'][:35]}...")
    
    print("\n" + "="*60)
    print("SUMMARY STATISTICS:")
    print("="*60)
    
    # Tax type distribution
    tax_types = {}
    for rate in SAMPLE_TAX_RATES:
        tax_type = rate['tax_type']
        if tax_type not in tax_types:
            tax_types[tax_type] = []
        tax_types[tax_type].append(rate['country'])
    
    print("\nTax Types Used Globally:")
    for tax_type, countries in sorted(tax_types.items()):
        print(f"  {tax_type}: {len(countries)} countries")
    
    # Rate ranges
    rates = [float(r['rate'].rstrip('%')) for r in SAMPLE_TAX_RATES]
    print(f"\nTax Rate Statistics:")
    print(f"  Lowest: {min(rates)}% ({[r['country'] for r in SAMPLE_TAX_RATES if r['rate'] == '0%'][0] if '0%' in [r['rate'] for r in SAMPLE_TAX_RATES] else 'N/A'})")
    print(f"  Highest: {max(rates)}% ({[r['country'] for r in SAMPLE_TAX_RATES if float(r['rate'].rstrip('%')) == max(rates)][0]})")
    print(f"  Average: {sum(rates)/len(rates):.1f}%")
    
    print("\n" + "="*60)
    print("HOW THIS WORKS IN YOUR SYSTEM:")
    print("="*60)
    print("1. User completes onboarding with business country")
    print("2. Background task automatically queries Claude AI")
    print("3. Tax rate is populated in GlobalSalesTaxRate table")
    print("4. POS system auto-fills the rate (but user can edit)")
    print("5. Monthly job updates rates to stay current")
    print("\nNOTE: All rates shown with disclaimer - users must verify!")

if __name__ == '__main__':
    main()