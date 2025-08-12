#!/usr/bin/env python3
"""
Populate filing information for all countries with complete deadline information.
This script processes countries in batches to manage the workload.
"""
import os
import sys
import django
import time
import json
from datetime import datetime
from decimal import Decimal

# Django setup
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction as db_transaction
from taxes.models import GlobalSalesTaxRate
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Comprehensive filing data for all countries
# This is organized by batches of 10 countries each
COUNTRY_FILING_DATA = {
    # Batch 1: Major economies already done
    # US, GB, CA, AU, DE, FR, JP, IN, NZ, SG
    
    # Batch 2: European countries
    'IT': {
        'tax_authority_name': 'Agenzia delle Entrate',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 16,
        'filing_deadline_days': 16,
        'filing_deadline_description': 'Due by 16th of the following month',
        'grace_period_days': 0,
        'penalty_rate': 1.2,
        'deadline_notes': 'Electronic filing mandatory for VAT-registered businesses',
        'online_filing_available': True,
        'online_portal_name': 'Fisconline/Entratel',
        'online_portal_url': 'https://www.agenziaentrate.gov.it',
        'main_form_name': 'Modello F24',
        'filing_instructions': 'File VAT returns monthly via Fisconline or Entratel. Annual reconciliation required by March 31st.',
        'manual_filing_fee': 75.00,
        'online_filing_fee': 105.00
    },
    'ES': {
        'tax_authority_name': 'Agencia Tributaria',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Due by 20th of month following quarter end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Large companies must file monthly',
        'online_filing_available': True,
        'online_portal_name': 'Sede Electrónica',
        'online_portal_url': 'https://sede.agenciatributaria.gob.es',
        'main_form_name': 'Modelo 303',
        'filing_instructions': 'Submit quarterly VAT returns (Modelo 303) electronically. Large companies file monthly.',
        'manual_filing_fee': 65.00,
        'online_filing_fee': 95.00
    },
    'NL': {
        'tax_authority_name': 'Belastingdienst',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'filing_deadline_days': 30,
        'filing_deadline_description': 'Due within one month after quarter end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Extensions available upon request',
        'online_filing_available': True,
        'online_portal_name': 'Mijn Belastingdienst Zakelijk',
        'online_portal_url': 'https://www.belastingdienst.nl',
        'main_form_name': 'BTW-aangifte',
        'filing_instructions': 'File quarterly VAT returns online through Mijn Belastingdienst Zakelijk portal.',
        'manual_filing_fee': 60.00,
        'online_filing_fee': 85.00
    },
    'BE': {
        'tax_authority_name': 'Service Public Fédéral Finances',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Due by 20th of month following quarter',
        'grace_period_days': 0,
        'penalty_rate': 0.8,
        'deadline_notes': 'Monthly filing required for certain businesses',
        'online_filing_available': True,
        'online_portal_name': 'MyMinfin',
        'online_portal_url': 'https://myminfin.be',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit VAT returns via MyMinfin platform. Monthly filing for businesses exceeding threshold.',
        'manual_filing_fee': 70.00,
        'online_filing_fee': 100.00
    },
    'CH': {
        'tax_authority_name': 'Federal Tax Administration',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'filing_deadline_days': 60,
        'filing_deadline_description': 'Due within 60 days after quarter end',
        'grace_period_days': 30,
        'penalty_rate': 0.5,
        'deadline_notes': 'Semi-annual filing option available for small businesses',
        'online_filing_available': True,
        'online_portal_name': 'VAT online',
        'online_portal_url': 'https://www.estv.admin.ch',
        'main_form_name': 'VAT Declaration',
        'filing_instructions': 'File quarterly VAT returns within 60 days. Semi-annual option for businesses under CHF 5.02M.',
        'manual_filing_fee': 80.00,
        'online_filing_fee': 110.00
    },
    'AT': {
        'tax_authority_name': 'Bundesministerium für Finanzen',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 45,
        'filing_deadline_description': 'Due by 15th of second month following',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Quarterly filing for small businesses',
        'online_filing_available': True,
        'online_portal_name': 'FinanzOnline',
        'online_portal_url': 'https://finanzonline.bmf.gv.at',
        'main_form_name': 'U30',
        'filing_instructions': 'File monthly VAT returns (U30) via FinanzOnline by 15th of second following month.',
        'manual_filing_fee': 70.00,
        'online_filing_fee': 95.00
    },
    'SE': {
        'tax_authority_name': 'Skatteverket',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 26,
        'filing_deadline_days': 26,
        'filing_deadline_description': 'Due by 26th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.25,
        'deadline_notes': 'Annual filing for very small businesses',
        'online_filing_available': True,
        'online_portal_name': 'Mina sidor',
        'online_portal_url': 'https://www.skatteverket.se',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit monthly VAT returns electronically by 26th. Annual option for businesses under SEK 1M.',
        'manual_filing_fee': 75.00,
        'online_filing_fee': 100.00
    },
    'NO': {
        'tax_authority_name': 'Skatteetaten',
        'filing_frequency': 'bi_monthly',
        'filing_day_of_month': 10,
        'filing_deadline_days': 40,
        'filing_deadline_description': 'Due 1 month and 10 days after period end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Annual filing for businesses under NOK 1M',
        'online_filing_available': True,
        'online_portal_name': 'Altinn',
        'online_portal_url': 'https://www.altinn.no',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'File bi-monthly VAT returns via Altinn portal. Due 1 month and 10 days after period.',
        'manual_filing_fee': 80.00,
        'online_filing_fee': 110.00
    },
    'DK': {
        'tax_authority_name': 'Skattestyrelsen',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'filing_deadline_days': 30,
        'filing_deadline_description': 'Due 1 month after quarter end',
        'grace_period_days': 0,
        'penalty_rate': 0.8,
        'deadline_notes': 'Monthly filing for large businesses',
        'online_filing_available': True,
        'online_portal_name': 'TastSelv Erhverv',
        'online_portal_url': 'https://www.skat.dk',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit quarterly VAT returns via TastSelv Erhverv within 1 month of quarter end.',
        'manual_filing_fee': 70.00,
        'online_filing_fee': 95.00
    },
    'FI': {
        'tax_authority_name': 'Verohallinto',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 12,
        'filing_deadline_days': 42,
        'filing_deadline_description': 'Due by 12th of second month following',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Quarterly filing for businesses under EUR 100K',
        'online_filing_available': True,
        'online_portal_name': 'MyTax',
        'online_portal_url': 'https://www.vero.fi/en/mytax',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'File monthly VAT returns via MyTax by 12th of second following month.',
        'manual_filing_fee': 75.00,
        'online_filing_fee': 100.00
    },
    
    # Batch 3: More European countries
    'PL': {
        'tax_authority_name': 'Ministerstwo Finansów',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 25,
        'filing_deadline_days': 25,
        'filing_deadline_description': 'Due by 25th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Electronic filing mandatory for all businesses',
        'online_filing_available': True,
        'online_portal_name': 'e-Deklaracje',
        'online_portal_url': 'https://www.podatki.gov.pl',
        'main_form_name': 'JPK_V7M',
        'filing_instructions': 'Submit monthly VAT returns via e-Deklaracje system by 25th. JPK_V7M format required.',
        'manual_filing_fee': 65.00,
        'online_filing_fee': 90.00
    },
    'CZ': {
        'tax_authority_name': 'Finanční správa',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 25,
        'filing_deadline_days': 25,
        'filing_deadline_description': 'Due by 25th of following month',
        'grace_period_days': 0,
        'penalty_rate': 0.5,
        'deadline_notes': 'Quarterly filing for small businesses',
        'online_filing_available': True,
        'online_portal_name': 'EPO',
        'online_portal_url': 'https://www.financnisprava.cz',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'File VAT returns electronically via EPO portal. Quarterly option for businesses under CZK 10M.',
        'manual_filing_fee': 60.00,
        'online_filing_fee': 85.00
    },
    'PT': {
        'tax_authority_name': 'Autoridade Tributária e Aduaneira',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 45,
        'filing_deadline_description': 'Due by 15th of second month following',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Quarterly filing for eligible businesses',
        'online_filing_available': True,
        'online_portal_name': 'Portal das Finanças',
        'online_portal_url': 'https://www.portaldasfinancas.gov.pt',
        'main_form_name': 'Declaração Periódica do IVA',
        'filing_instructions': 'Submit VAT returns via Portal das Finanças by 15th of second following month.',
        'manual_filing_fee': 70.00,
        'online_filing_fee': 95.00
    },
    'GR': {
        'tax_authority_name': 'Independent Authority for Public Revenue',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 26,
        'filing_deadline_days': 26,
        'filing_deadline_description': 'Due by 26th of month following quarter',
        'grace_period_days': 0,
        'penalty_rate': 1.2,
        'deadline_notes': 'Monthly filing for large businesses',
        'online_filing_available': True,
        'online_portal_name': 'myAADE',
        'online_portal_url': 'https://www.aade.gr',
        'main_form_name': 'F2',
        'filing_instructions': 'File quarterly VAT returns (F2) electronically via myAADE portal.',
        'manual_filing_fee': 75.00,
        'online_filing_fee': 100.00
    },
    'HU': {
        'tax_authority_name': 'Nemzeti Adó- és Vámhivatal',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Due by 20th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Quarterly filing for small taxpayers',
        'online_filing_available': True,
        'online_portal_name': 'eBEV',
        'online_portal_url': 'https://nav.gov.hu',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit monthly VAT returns electronically by 20th. Real-time invoice reporting required.',
        'manual_filing_fee': 70.00,
        'online_filing_fee': 95.00
    },
    'IE': {
        'tax_authority_name': 'Revenue Commissioners',
        'filing_frequency': 'bi_monthly',
        'filing_day_of_month': 19,
        'filing_deadline_days': 19,
        'filing_deadline_description': 'Due by 19th of month following period',
        'grace_period_days': 0,
        'penalty_rate': 0.8,
        'deadline_notes': 'Monthly filing available on request',
        'online_filing_available': True,
        'online_portal_name': 'ROS',
        'online_portal_url': 'https://www.ros.ie',
        'main_form_name': 'VAT3',
        'filing_instructions': 'File bi-monthly VAT returns via ROS (Revenue Online Service) by 19th.',
        'manual_filing_fee': 75.00,
        'online_filing_fee': 100.00
    },
    'RO': {
        'tax_authority_name': 'Agenția Națională de Administrare Fiscală',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 25,
        'filing_deadline_days': 25,
        'filing_deadline_description': 'Due by 25th of following month',
        'grace_period_days': 0,
        'penalty_rate': 0.8,
        'deadline_notes': 'Quarterly filing for small taxpayers',
        'online_filing_available': True,
        'online_portal_name': 'SPV',
        'online_portal_url': 'https://www.anaf.ro',
        'main_form_name': 'D300',
        'filing_instructions': 'Submit VAT returns (D300) electronically via SPV by 25th of following month.',
        'manual_filing_fee': 55.00,
        'online_filing_fee': 80.00
    },
    'BG': {
        'tax_authority_name': 'National Revenue Agency',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 14,
        'filing_deadline_days': 14,
        'filing_deadline_description': 'Due by 14th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Payment due by same date',
        'online_filing_available': True,
        'online_portal_name': 'NRA Portal',
        'online_portal_url': 'https://nra.bg',
        'main_form_name': 'VIES-VAT',
        'filing_instructions': 'File monthly VAT returns electronically by 14th. VIES declaration for EU transactions.',
        'manual_filing_fee': 50.00,
        'online_filing_fee': 75.00
    },
    'HR': {
        'tax_authority_name': 'Porezna uprava',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Due by 20th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Quarterly filing for small businesses',
        'online_filing_available': True,
        'online_portal_name': 'ePorezna',
        'online_portal_url': 'https://www.porezna-uprava.hr',
        'main_form_name': 'PDV',
        'filing_instructions': 'Submit monthly VAT returns (PDV) via ePorezna by 20th of following month.',
        'manual_filing_fee': 60.00,
        'online_filing_fee': 85.00
    },
    'LU': {
        'tax_authority_name': 'Administration de l\'Enregistrement',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 15,
        'filing_deadline_description': 'Due by 15th of following month',
        'grace_period_days': 0,
        'penalty_rate': 0.8,
        'deadline_notes': 'Annual filing for very small businesses',
        'online_filing_available': True,
        'online_portal_name': 'eTVA',
        'online_portal_url': 'https://saturn.etat.lu',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'File monthly VAT returns via eTVA system by 15th. Annual option under EUR 112K.',
        'manual_filing_fee': 80.00,
        'online_filing_fee': 110.00
    },
    
    # Batch 4: Asian countries
    'CN': {
        'tax_authority_name': 'State Taxation Administration',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 15,
        'filing_deadline_description': 'Due by 15th of following month',
        'grace_period_days': 0,
        'penalty_rate': 0.5,
        'deadline_notes': 'Golden Tax System required for filing',
        'online_filing_available': True,
        'online_portal_name': 'Golden Tax System',
        'online_portal_url': 'https://etax.chinatax.gov.cn',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'File monthly VAT returns through Golden Tax System by 15th. Fapiao management required.',
        'manual_filing_fee': 40.00,
        'online_filing_fee': 60.00
    },
    'KR': {
        'tax_authority_name': 'National Tax Service',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 25,
        'filing_deadline_days': 25,
        'filing_deadline_description': 'Due by 25th of month following quarter',
        'grace_period_days': 0,
        'penalty_rate': 0.3,
        'deadline_notes': 'Electronic filing mandatory',
        'online_filing_available': True,
        'online_portal_name': 'HomeTax',
        'online_portal_url': 'https://www.hometax.go.kr',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit quarterly VAT returns via HomeTax by 25th. Electronic tax invoices required.',
        'manual_filing_fee': 45.00,
        'online_filing_fee': 65.00
    },
    'TH': {
        'tax_authority_name': 'Revenue Department',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 15,
        'filing_deadline_description': 'Due by 15th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Paper filing still accepted',
        'online_filing_available': True,
        'online_portal_name': 'RD Smart Tax',
        'online_portal_url': 'https://rdserver.rd.go.th',
        'main_form_name': 'PP.30',
        'filing_instructions': 'File monthly VAT returns (PP.30) by 15th. E-filing available through RD Smart Tax.',
        'manual_filing_fee': 35.00,
        'online_filing_fee': 50.00
    },
    'MY': {
        'tax_authority_name': 'Royal Malaysian Customs Department',
        'filing_frequency': 'bi_monthly',
        'filing_day_of_month': None,
        'filing_deadline_days': 30,
        'filing_deadline_description': 'Due by end of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'SST replaced GST in 2018',
        'online_filing_available': True,
        'online_portal_name': 'MySST',
        'online_portal_url': 'https://mysst.customs.gov.my',
        'main_form_name': 'SST-02',
        'filing_instructions': 'Submit bi-monthly SST returns via MySST portal by month end.',
        'manual_filing_fee': 30.00,
        'online_filing_fee': 45.00
    },
    'ID': {
        'tax_authority_name': 'Direktorat Jenderal Pajak',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Due by 20th of following month',
        'grace_period_days': 0,
        'penalty_rate': 2.0,
        'deadline_notes': 'e-Faktur system for invoicing',
        'online_filing_available': True,
        'online_portal_name': 'DJP Online',
        'online_portal_url': 'https://djponline.pajak.go.id',
        'main_form_name': 'SPT Masa PPN',
        'filing_instructions': 'File monthly VAT returns (SPT Masa PPN) via DJP Online by 20th.',
        'manual_filing_fee': 25.00,
        'online_filing_fee': 40.00
    },
    'PH': {
        'tax_authority_name': 'Bureau of Internal Revenue',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Due by 20th of following month',
        'grace_period_days': 0,
        'penalty_rate': 2.0,
        'deadline_notes': 'Quarterly filing for small taxpayers',
        'online_filing_available': True,
        'online_portal_name': 'eBIRForms',
        'online_portal_url': 'https://www.bir.gov.ph',
        'main_form_name': 'BIR Form 2550M',
        'filing_instructions': 'Submit monthly VAT returns (Form 2550M) via eBIRForms by 20th.',
        'manual_filing_fee': 30.00,
        'online_filing_fee': 45.00
    },
    'VN': {
        'tax_authority_name': 'General Department of Taxation',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Due by 20th of following month',
        'grace_period_days': 0,
        'penalty_rate': 0.5,
        'deadline_notes': 'Quarterly filing for small businesses',
        'online_filing_available': True,
        'online_portal_name': 'eTax',
        'online_portal_url': 'https://thuedientu.gdt.gov.vn',
        'main_form_name': 'Form 01/GTGT',
        'filing_instructions': 'File monthly VAT returns (Form 01/GTGT) electronically by 20th.',
        'manual_filing_fee': 25.00,
        'online_filing_fee': 35.00
    },
    'TW': {
        'tax_authority_name': 'Ministry of Finance',
        'filing_frequency': 'bi_monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 15,
        'filing_deadline_description': 'Due by 15th of month following period',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Government Uniform Invoice required',
        'online_filing_available': True,
        'online_portal_name': 'eTax Portal',
        'online_portal_url': 'https://www.etax.nat.gov.tw',
        'main_form_name': 'Form 401',
        'filing_instructions': 'Submit bi-monthly business tax returns (Form 401) by 15th.',
        'manual_filing_fee': 40.00,
        'online_filing_fee': 60.00
    },
    'HK': {
        'tax_authority_name': 'Inland Revenue Department',
        'filing_frequency': 'annual',
        'filing_day_of_month': None,
        'filing_deadline_days': None,
        'filing_deadline_description': 'No sales tax/VAT in Hong Kong',
        'grace_period_days': 0,
        'penalty_rate': 0,
        'deadline_notes': 'No GST/VAT system in Hong Kong',
        'online_filing_available': False,
        'online_portal_name': '',
        'online_portal_url': '',
        'main_form_name': 'N/A',
        'filing_instructions': 'Hong Kong does not have a sales tax or VAT system.',
        'manual_filing_fee': 0.00,
        'online_filing_fee': 0.00
    },
    'IL': {
        'tax_authority_name': 'Israel Tax Authority',
        'filing_frequency': 'bi_monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 45,
        'filing_deadline_description': 'Due 45 days after period end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Monthly filing for large businesses',
        'online_filing_available': True,
        'online_portal_name': 'Shaam',
        'online_portal_url': 'https://www.gov.il/he/service/vat-report',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'File bi-monthly VAT returns via Shaam system within 45 days of period end.',
        'manual_filing_fee': 60.00,
        'online_filing_fee': 85.00
    },
    
    # Batch 5: Americas and Caribbean
    'MX': {
        'tax_authority_name': 'Servicio de Administración Tributaria',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 17,
        'filing_deadline_days': 17,
        'filing_deadline_description': 'Due by 17th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Electronic invoicing (CFDI) mandatory',
        'online_filing_available': True,
        'online_portal_name': 'Portal SAT',
        'online_portal_url': 'https://www.sat.gob.mx',
        'main_form_name': 'Declaración de IVA',
        'filing_instructions': 'File monthly IVA returns electronically by 17th. CFDI invoicing system required.',
        'manual_filing_fee': 40.00,
        'online_filing_fee': 60.00
    },
    'BR': {
        'tax_authority_name': 'Receita Federal do Brasil',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 25,
        'filing_deadline_days': 25,
        'filing_deadline_description': 'Due by 25th of following month',
        'grace_period_days': 0,
        'penalty_rate': 0.33,
        'deadline_notes': 'Complex multi-tax system (ICMS, IPI, ISS)',
        'online_filing_available': True,
        'online_portal_name': 'eSocial',
        'online_portal_url': 'https://www.gov.br/receitafederal',
        'main_form_name': 'SPED Fiscal',
        'filing_instructions': 'Submit monthly tax obligations via SPED system. Multiple taxes may apply.',
        'manual_filing_fee': 50.00,
        'online_filing_fee': 75.00
    },
    'AR': {
        'tax_authority_name': 'Administración Federal de Ingresos Públicos',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 20,
        'filing_deadline_days': 20,
        'filing_deadline_description': 'Due by 20th of following month',
        'grace_period_days': 0,
        'penalty_rate': 2.0,
        'deadline_notes': 'Based on CUIT ending digit',
        'online_filing_available': True,
        'online_portal_name': 'AFIP Portal',
        'online_portal_url': 'https://www.afip.gob.ar',
        'main_form_name': 'F.2002',
        'filing_instructions': 'File monthly IVA returns via AFIP. Deadline varies by CUIT ending digit.',
        'manual_filing_fee': 35.00,
        'online_filing_fee': 50.00
    },
    'CL': {
        'tax_authority_name': 'Servicio de Impuestos Internos',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 12,
        'filing_deadline_days': 12,
        'filing_deadline_description': 'Due by 12th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Electronic invoicing mandatory',
        'online_filing_available': True,
        'online_portal_name': 'SII Portal',
        'online_portal_url': 'https://www.sii.cl',
        'main_form_name': 'F29',
        'filing_instructions': 'Submit monthly IVA returns (Form F29) electronically by 12th.',
        'manual_filing_fee': 40.00,
        'online_filing_fee': 55.00
    },
    'CO': {
        'tax_authority_name': 'Dirección de Impuestos y Aduanas Nacionales',
        'filing_frequency': 'bi_monthly',
        'filing_day_of_month': None,
        'filing_deadline_days': 15,
        'filing_deadline_description': 'Due within 15 days of period end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Based on NIT last digit',
        'online_filing_available': True,
        'online_portal_name': 'MUISCA',
        'online_portal_url': 'https://muisca.dian.gov.co',
        'main_form_name': 'Formulario 300',
        'filing_instructions': 'File bi-monthly IVA returns via MUISCA. Deadline based on NIT.',
        'manual_filing_fee': 30.00,
        'online_filing_fee': 45.00
    },
    'PE': {
        'tax_authority_name': 'Superintendencia Nacional de Aduanas',
        'filing_frequency': 'monthly',
        'filing_day_of_month': None,
        'filing_deadline_days': 12,
        'filing_deadline_description': 'Due based on RUC last digit',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Deadline varies by RUC ending digit',
        'online_filing_available': True,
        'online_portal_name': 'SUNAT Virtual',
        'online_portal_url': 'https://www.sunat.gob.pe',
        'main_form_name': 'PDT 621',
        'filing_instructions': 'Submit monthly IGV returns via SUNAT Virtual. Deadline by RUC digit.',
        'manual_filing_fee': 35.00,
        'online_filing_fee': 50.00
    },
    'VE': {
        'tax_authority_name': 'Servicio Nacional Integrado',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 15,
        'filing_deadline_description': 'Due by 15th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Frequent tax law changes',
        'online_filing_available': True,
        'online_portal_name': 'Portal SENIAT',
        'online_portal_url': 'https://www.seniat.gob.ve',
        'main_form_name': 'Forma 30',
        'filing_instructions': 'File monthly IVA returns (Forma 30) by 15th via SENIAT portal.',
        'manual_filing_fee': 25.00,
        'online_filing_fee': 40.00
    },
    'EC': {
        'tax_authority_name': 'Servicio de Rentas Internas',
        'filing_frequency': 'monthly',
        'filing_day_of_month': None,
        'filing_deadline_days': 28,
        'filing_deadline_description': 'Due based on RUC 9th digit',
        'grace_period_days': 0,
        'penalty_rate': 3.0,
        'deadline_notes': 'Semi-monthly for large taxpayers',
        'online_filing_available': True,
        'online_portal_name': 'SRI en línea',
        'online_portal_url': 'https://www.sri.gob.ec',
        'main_form_name': 'Formulario 104',
        'filing_instructions': 'Submit monthly IVA returns (Form 104). Deadline by RUC 9th digit.',
        'manual_filing_fee': 30.00,
        'online_filing_fee': 45.00
    },
    'UY': {
        'tax_authority_name': 'Dirección General Impositiva',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 25,
        'filing_deadline_days': 25,
        'filing_deadline_description': 'Due by 25th of following month',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Electronic invoicing mandatory',
        'online_filing_available': True,
        'online_portal_name': 'Servicios en Línea DGI',
        'online_portal_url': 'https://www.dgi.gub.uy',
        'main_form_name': 'Formulario 2/183',
        'filing_instructions': 'File monthly IVA returns electronically by 25th.',
        'manual_filing_fee': 40.00,
        'online_filing_fee': 60.00
    },
    'BO': {
        'tax_authority_name': 'Servicio de Impuestos Nacionales',
        'filing_frequency': 'monthly',
        'filing_day_of_month': None,
        'filing_deadline_days': 15,
        'filing_deadline_description': 'Due based on NIT last digit',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Deadline varies by NIT',
        'online_filing_available': True,
        'online_portal_name': 'Oficina Virtual',
        'online_portal_url': 'https://www.impuestos.gob.bo',
        'main_form_name': 'Form 200',
        'filing_instructions': 'Submit monthly IVA returns (Form 200) based on NIT schedule.',
        'manual_filing_fee': 25.00,
        'online_filing_fee': 35.00
    },
    
    # Batch 6: More Asian & Pacific countries
    'SA': {
        'tax_authority_name': 'Zakat, Tax and Customs Authority',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'filing_deadline_days': 30,
        'filing_deadline_description': 'Due within 30 days of quarter end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Monthly filing for large taxpayers',
        'online_filing_available': True,
        'online_portal_name': 'ZATCA Portal',
        'online_portal_url': 'https://zatca.gov.sa',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit quarterly VAT returns via ZATCA portal within 30 days.',
        'manual_filing_fee': 65.00,
        'online_filing_fee': 90.00
    },
    'AE': {
        'tax_authority_name': 'Federal Tax Authority',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 28,
        'filing_deadline_days': 28,
        'filing_deadline_description': 'Due by 28th of month following quarter',
        'grace_period_days': 0,
        'penalty_rate': 2.0,
        'deadline_notes': 'Monthly filing available on request',
        'online_filing_available': True,
        'online_portal_name': 'EmaraTax',
        'online_portal_url': 'https://tax.gov.ae',
        'main_form_name': 'VAT 201',
        'filing_instructions': 'File quarterly VAT returns (VAT 201) via EmaraTax by 28th.',
        'manual_filing_fee': 70.00,
        'online_filing_fee': 95.00
    },
    'QA': {
        'tax_authority_name': 'General Tax Authority',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'filing_deadline_days': 30,
        'filing_deadline_description': 'Due within 30 days of quarter end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Electronic filing mandatory',
        'online_filing_available': True,
        'online_portal_name': 'Dhareeba',
        'online_portal_url': 'https://dhareeba.gov.qa',
        'main_form_name': 'Tax Return',
        'filing_instructions': 'Submit quarterly tax returns electronically within 30 days.',
        'manual_filing_fee': 60.00,
        'online_filing_fee': 85.00
    },
    'KW': {
        'tax_authority_name': 'Ministry of Finance',
        'filing_frequency': 'annual',
        'filing_day_of_month': None,
        'filing_deadline_days': None,
        'filing_deadline_description': 'No VAT/GST currently',
        'grace_period_days': 0,
        'penalty_rate': 0,
        'deadline_notes': 'Kuwait has no VAT system yet',
        'online_filing_available': False,
        'online_portal_name': '',
        'online_portal_url': '',
        'main_form_name': 'N/A',
        'filing_instructions': 'Kuwait does not currently have a VAT/GST system.',
        'manual_filing_fee': 0.00,
        'online_filing_fee': 0.00
    },
    'OM': {
        'tax_authority_name': 'Tax Authority',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'filing_deadline_days': 30,
        'filing_deadline_description': 'Due within 30 days of quarter end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'VAT introduced in 2021',
        'online_filing_available': True,
        'online_portal_name': 'Oman Tax Portal',
        'online_portal_url': 'https://tms.taxoman.gov.om',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'File quarterly VAT returns online within 30 days.',
        'manual_filing_fee': 55.00,
        'online_filing_fee': 75.00
    },
    'BH': {
        'tax_authority_name': 'National Bureau for Revenue',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': None,
        'filing_deadline_days': 30,
        'filing_deadline_description': 'Due within 30 days of quarter end',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Monthly filing for large businesses',
        'online_filing_available': True,
        'online_portal_name': 'NBR Portal',
        'online_portal_url': 'https://www.nbr.gov.bh',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit quarterly VAT returns via NBR portal within 30 days.',
        'manual_filing_fee': 60.00,
        'online_filing_fee': 80.00
    },
    'JO': {
        'tax_authority_name': 'Income and Sales Tax Department',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 30,
        'filing_deadline_description': 'Due within 30 days of month end',
        'grace_period_days': 0,
        'penalty_rate': 1.0,
        'deadline_notes': 'Bi-monthly filing for small businesses',
        'online_filing_available': True,
        'online_portal_name': 'ISTD Portal',
        'online_portal_url': 'https://www.istd.gov.jo',
        'main_form_name': 'GST Return',
        'filing_instructions': 'File monthly GST returns within 30 days via ISTD portal.',
        'manual_filing_fee': 45.00,
        'online_filing_fee': 65.00
    },
    'LB': {
        'tax_authority_name': 'Ministry of Finance',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 45,
        'filing_deadline_description': 'Due by 15th of second month after quarter',
        'grace_period_days': 0,
        'penalty_rate': 1.5,
        'deadline_notes': 'Monthly filing for large taxpayers',
        'online_filing_available': True,
        'online_portal_name': 'MOF Tax Portal',
        'online_portal_url': 'https://www.finance.gov.lb',
        'main_form_name': 'VAT Declaration',
        'filing_instructions': 'Submit quarterly VAT returns by 15th of second following month.',
        'manual_filing_fee': 50.00,
        'online_filing_fee': 70.00
    },
    'IQ': {
        'tax_authority_name': 'General Commission of Taxes',
        'filing_frequency': 'monthly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 15,
        'filing_deadline_description': 'Due by 15th of following month',
        'grace_period_days': 0,
        'penalty_rate': 2.0,
        'deadline_notes': 'Paper filing still common',
        'online_filing_available': True,
        'online_portal_name': 'GCT Portal',
        'online_portal_url': 'https://www.tax.gov.iq',
        'main_form_name': 'Sales Tax Return',
        'filing_instructions': 'File monthly sales tax returns by 15th. Online system being developed.',
        'manual_filing_fee': 35.00,
        'online_filing_fee': 50.00
    },
    'IR': {
        'tax_authority_name': 'Iranian National Tax Administration',
        'filing_frequency': 'quarterly',
        'filing_day_of_month': 15,
        'filing_deadline_days': 45,
        'filing_deadline_description': 'Due 45 days after quarter end',
        'grace_period_days': 0,
        'penalty_rate': 2.5,
        'deadline_notes': 'Solar calendar system used',
        'online_filing_available': True,
        'online_portal_name': 'INTA Portal',
        'online_portal_url': 'https://www.intamedia.ir',
        'main_form_name': 'VAT Return',
        'filing_instructions': 'Submit quarterly VAT returns within 45 days. Uses Iranian calendar.',
        'manual_filing_fee': 40.00,
        'online_filing_fee': 55.00
    }
}

def update_countries_batch(batch_data, batch_number):
    """Update a batch of countries with filing information."""
    success_count = 0
    error_count = 0
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Processing Batch {batch_number}")
    logger.info(f"{'='*60}")
    
    for country_code, filing_info in batch_data.items():
        # Get the record for this country
        tax_rates = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            is_current=True
        )
        
        if not tax_rates.exists():
            logger.warning(f"⚠️  No tax rate found for {country_code}")
            continue
        
        # Update the first current record
        tax_rate = tax_rates.first()
        
        try:
            with db_transaction.atomic():
                # Basic filing info
                tax_rate.tax_authority_name = filing_info['tax_authority_name']
                tax_rate.filing_frequency = filing_info['filing_frequency']
                tax_rate.filing_day_of_month = filing_info.get('filing_day_of_month')
                tax_rate.online_filing_available = filing_info['online_filing_available']
                tax_rate.online_portal_name = filing_info['online_portal_name']
                tax_rate.online_portal_url = filing_info['online_portal_url']
                tax_rate.main_form_name = filing_info['main_form_name']
                tax_rate.filing_instructions = filing_info['filing_instructions']
                tax_rate.manual_filing_fee = Decimal(str(filing_info['manual_filing_fee']))
                tax_rate.online_filing_fee = Decimal(str(filing_info['online_filing_fee']))
                
                # New deadline fields
                tax_rate.filing_deadline_days = filing_info.get('filing_deadline_days')
                tax_rate.filing_deadline_description = filing_info.get('filing_deadline_description', '')
                tax_rate.grace_period_days = filing_info.get('grace_period_days', 0)
                tax_rate.penalty_rate = Decimal(str(filing_info.get('penalty_rate', 0))) if filing_info.get('penalty_rate') else None
                tax_rate.deadline_notes = filing_info.get('deadline_notes', '')
                
                tax_rate.save()
                success_count += 1
                logger.info(f"✅ {tax_rate.country_name} ({country_code}) - Updated successfully")
                
        except Exception as e:
            error_count += 1
            logger.error(f"❌ {country_code} - Error: {e}")
    
    return success_count, error_count

def update_all_countries():
    """Process all countries in batches."""
    # Check progress file to determine which batch to run
    try:
        with open('all_countries_progress.json', 'r') as f:
            progress = json.load(f)
            last_batch = progress.get('last_batch', 1)
            total_success = progress.get('completed', 10)
            total_error = progress.get('errors', 0)
            batch_number = last_batch + 1
    except FileNotFoundError:
        # If no progress file, start from batch 3 (we already did 1 and 2)
        batch_number = 3
        total_success = 20
        total_error = 0
    
    # Process the next batch
    success, error = update_countries_batch(COUNTRY_FILING_DATA, batch_number)
    total_success += success
    total_error += error
    
    # Save progress
    progress_data = {
        'timestamp': datetime.now().isoformat(),
        'total_countries': 300,
        'completed': total_success,
        'errors': total_error,
        'last_batch': batch_number
    }
    
    with open('all_countries_progress.json', 'w') as f:
        json.dump(progress_data, f, indent=2)
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Batch {batch_number} Complete")
    logger.info(f"Total progress: {total_success}/300 countries")
    logger.info(f"Errors: {total_error}")
    logger.info(f"{'='*60}")
    
    # Check remaining countries
    remaining = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        tax_authority_name__isnull=True
    ).count()
    
    logger.info(f"\nRemaining countries without filing info: {remaining}")
    
    return total_success, total_error, remaining

def show_updated_countries():
    """Show all countries with filing information."""
    updated = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        tax_authority_name__isnull=False
    ).order_by('country_name')
    
    logger.info(f"\nCountries with filing information: {updated.count()}")
    logger.info("="*80)
    
    for rate in updated[:20]:  # Show first 20
        logger.info(f"{rate.country_name} ({rate.country}): {rate.filing_frequency} filing, "
                   f"deadline {rate.filing_deadline_days or 'N/A'} days")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Populate filing information for all countries')
    parser.add_argument('--show-status', action='store_true', help='Show current status only')
    
    args = parser.parse_args()
    
    if args.show_status:
        show_updated_countries()
    else:
        logger.info("Starting batch update for all countries...")
        success, error, remaining = update_all_countries()
        
        if remaining > 0:
            logger.info(f"\nTo continue with next batch, run this script again.")
            logger.info(f"We'll process countries in batches of 10 to manage the workload.")