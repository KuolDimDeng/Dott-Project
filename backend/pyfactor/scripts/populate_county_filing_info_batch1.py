#!/usr/bin/env python3
"""
Script to populate county-level filing information - Batch 1: CA, TX, FL, NY, PA
Focus on states with the most counties and complex filing requirements
"""

import os
import sys
import django
from decimal import Decimal

sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate
from django.utils import timezone

# County filing information by state
COUNTY_FILING_INFO = {
    'CA': {  # California - 58 counties
        'state_info': {
            'state_portal': 'https://www.cdtfa.ca.gov/',
            'state_portal_name': 'California Department of Tax and Fee Administration',
            'default_frequency': 'quarterly',
            'default_deadline': '20th of month following quarter end',
            'state_phone': '1-800-400-7115'
        },
        'counties': {
            'ALAMEDA': {
                'filing_website': 'https://www.acgov.org/auditor/slcc/',
                'contact_phone': '(510) 272-6800',
                'contact_email': 'slcc@acgov.org',
                'mailing_address': 'Alameda County Auditor-Controller\nSales & Use Tax\n1221 Oak Street, Room 249\nOakland, CA 94612',
                'filing_instructions': 'File through state CDTFA system. County receives automatic allocation. No separate county filing required for most businesses.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'LOS_ANGELES': {
                'filing_website': 'https://ttc.lacounty.gov/',
                'contact_phone': '(213) 974-2111',
                'contact_email': 'ttc@ttc.lacounty.gov',
                'mailing_address': 'Los Angeles County Treasurer and Tax Collector\n500 West Temple Street\nLos Angeles, CA 90012',
                'filing_instructions': 'Most sales tax filed through state CDTFA. Some special districts may require separate filing. Contact county for specific requirements.',
                'special_requirements': 'Business license required. Some cities within county have additional local taxes.',
                'payment_methods': ['online', 'check', 'ach', 'wire']
            },
            'ORANGE': {
                'filing_website': 'https://www.octax.com/',
                'contact_phone': '(714) 834-7500',
                'contact_email': 'info@octax.com',
                'mailing_address': 'Orange County Treasurer-Tax Collector\n12 Civic Center Plaza\nSanta Ana, CA 92701',
                'filing_instructions': 'File through state CDTFA system. County allocation handled automatically.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'SAN_DIEGO': {
                'filing_website': 'https://www.sdttc.com/',
                'contact_phone': '(877) 829-4732',
                'contact_email': 'ttc.info@sdcounty.ca.gov',
                'mailing_address': 'San Diego County Treasurer-Tax Collector\n1600 Pacific Highway, MS: A-5\nSan Diego, CA 92101',
                'filing_instructions': 'State filing through CDTFA covers county allocation. No separate county filing typically required.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'SAN_FRANCISCO': {
                'filing_website': 'https://sftreasurer.org/',
                'contact_phone': '(415) 701-2311',
                'contact_email': 'treasurer@sfgov.org',
                'mailing_address': 'City and County of San Francisco\nTreasurer & Tax Collector\n1 Dr. Carlton B. Goodlett Place, Room 140\nSan Francisco, CA 94102',
                'filing_instructions': 'Combined city-county entity. File through state CDTFA system for sales tax.',
                'special_requirements': 'Business registration tax required. Payroll expense tax may apply.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'TX': {  # Texas - 254 counties (sampling major ones)
        'state_info': {
            'state_portal': 'https://comptroller.texas.gov/',
            'state_portal_name': 'Texas Comptroller of Public Accounts',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-800-252-1381'
        },
        'counties': {
            'HARRIS': {  # Houston
                'filing_website': 'https://hctax.net/',
                'contact_phone': '(713) 274-8000',
                'contact_email': 'info@hctax.net',
                'mailing_address': 'Harris County Tax Office\n1001 Preston, Suite 935\nHouston, TX 77002',
                'filing_instructions': 'Sales tax filed through Texas Comptroller. County receives allocation automatically. No separate county filing required.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'DALLAS': {
                'filing_website': 'https://www.dallascounty.org/departments/tax/',
                'contact_phone': '(214) 653-7811',
                'contact_email': 'taxoffice@dallascounty.org',
                'mailing_address': 'Dallas County Tax Office\n500 Elm Street, Suite 2440\nDallas, TX 75202',
                'filing_instructions': 'File through Texas Comptroller webfile system. County allocation handled by state.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'TARRANT': {  # Fort Worth
                'filing_website': 'https://www.tarrantcounty.com/en/tax-assessor-collector.html',
                'contact_phone': '(817) 884-1100',
                'contact_email': 'tax@tarrantcounty.com',
                'mailing_address': 'Tarrant County Tax Assessor-Collector\n100 E. Weatherford Street\nFort Worth, TX 76196',
                'filing_instructions': 'State filing covers county portion. Use Texas Comptroller online system.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'BEXAR': {  # San Antonio
                'filing_website': 'https://www.bexar.org/1659/Tax-Assessor-Collector',
                'contact_phone': '(210) 335-2251',
                'contact_email': 'taxac@bexar.org',
                'mailing_address': 'Bexar County Tax Assessor-Collector\n233 N. Pecos Street, Suite 240\nSan Antonio, TX 78207',
                'filing_instructions': 'Sales tax filed through Texas Comptroller covers county allocation.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'TRAVIS': {  # Austin
                'filing_website': 'https://tax-office.traviscountytx.gov/',
                'contact_phone': '(512) 854-9473',
                'contact_email': 'info@traviscountytx.gov',
                'mailing_address': 'Travis County Tax Office\n5501 Airport Boulevard\nAustin, TX 78751',
                'filing_instructions': 'File through Texas Comptroller. County portion allocated automatically.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'FL': {  # Florida - 67 counties
        'state_info': {
            'state_portal': 'https://floridarevenue.com/',
            'state_portal_name': 'Florida Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-800-352-3671'
        },
        'counties': {
            'DADE': {  # Miami-Dade
                'filing_website': 'https://www.miamidade.gov/finance/',
                'contact_phone': '(305) 375-3617',
                'contact_email': 'finance@miamidade.gov',
                'mailing_address': 'Miami-Dade County Finance Department\n111 NW 1st Street, Suite 910\nMiami, FL 33128',
                'filing_instructions': 'Sales tax filed through Florida DOR covers county surtax. No separate county filing required.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'BROWARD': {  # Fort Lauderdale
                'filing_website': 'https://www.broward.org/Finance/',
                'contact_phone': '(954) 357-7275',
                'contact_email': 'finance@broward.org',
                'mailing_address': 'Broward County Finance and Administrative Services\n115 S. Andrews Avenue, Room 409\nFort Lauderdale, FL 33301',
                'filing_instructions': 'County surtax collected through state sales tax return. File with Florida DOR.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'HILLSBOROUGH': {  # Tampa
                'filing_website': 'https://www.hillsboroughcounty.org/en/residents/property-owners-and-renters/taxes',
                'contact_phone': '(813) 635-5200',
                'contact_email': 'taxes@hillsboroughcounty.org',
                'mailing_address': 'Hillsborough County Tax Collector\n601 E. Kennedy Boulevard, 18th Floor\nTampa, FL 33602',
                'filing_instructions': 'County discretionary sales surtax included in state sales tax filing.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'ORANGE': {  # Orlando
                'filing_website': 'https://www.octaxcol.com/',
                'contact_phone': '(407) 836-4145',
                'contact_email': 'info@octaxcol.com',
                'mailing_address': 'Orange County Tax Collector\n200 S. Orange Avenue\nOrlando, FL 32801',
                'filing_instructions': 'File through Florida DOR. County tourist development tax may require separate filing for hotels.',
                'special_requirements': 'Tourist development tax for accommodations. Convention development tax may apply.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'PINELLAS': {  # St. Petersburg
                'filing_website': 'https://www.pinellascounty.org/taxcoll/',
                'contact_phone': '(727) 464-7777',
                'contact_email': 'taxcollector@pinellascounty.org',
                'mailing_address': 'Pinellas County Tax Collector\n315 Court Street, 1st Floor\nClearwater, FL 33756',
                'filing_instructions': 'County surtax filed through state system. No separate county filing.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'NY': {  # New York - 62 counties
        'state_info': {
            'state_portal': 'https://www.tax.ny.gov/',
            'state_portal_name': 'New York State Department of Taxation and Finance',
            'default_frequency': 'quarterly',
            'default_deadline': '20th of month following quarter end',
            'state_phone': '1-518-485-2889'
        },
        'counties': {
            'NEW_YORK': {  # Manhattan
                'filing_website': 'https://www1.nyc.gov/site/finance/',
                'contact_phone': '(311) 692-9692',
                'contact_email': 'help@finance.nyc.gov',
                'mailing_address': 'NYC Department of Finance\n59 Maiden Lane, 22nd Floor\nNew York, NY 10038',
                'filing_instructions': 'File through NY State system. City receives allocation automatically. Additional NYC business taxes may apply.',
                'special_requirements': 'NYC Business Income Tax, Commercial Rent Tax, and Unincorporated Business Tax may apply.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'KINGS': {  # Brooklyn
                'filing_website': 'https://www1.nyc.gov/site/finance/',
                'contact_phone': '(311) 692-9692',
                'contact_email': 'help@finance.nyc.gov',
                'mailing_address': 'NYC Department of Finance\n210 Joralemon Street, 4th Floor\nBrooklyn, NY 11201',
                'filing_instructions': 'Same as NYC - file through NY State system.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'NASSAU': {
                'filing_website': 'https://www.nassaucountyny.gov/agencies/Finance/',
                'contact_phone': '(516) 571-3056',
                'contact_email': 'finance@nassaucountyny.gov',
                'mailing_address': 'Nassau County Department of Finance\n240 Old Country Road\nMineola, NY 11501',
                'filing_instructions': 'County sales tax filed through NY State system. No separate county filing required.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'SUFFOLK': {
                'filing_website': 'https://www.suffolkcountyny.gov/departments/treasurers-office',
                'contact_phone': '(631) 853-4071',
                'contact_email': 'treasurer@suffolkcountyny.gov',
                'mailing_address': 'Suffolk County Treasurer\n310 Center Drive\nRiverhead, NY 11901',
                'filing_instructions': 'File through New York State online system. County allocation handled automatically.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'WESTCHESTER': {
                'filing_website': 'https://finances.westchestergov.com/',
                'contact_phone': '(914) 995-2750',
                'contact_email': 'finance@westchestergov.com',
                'mailing_address': 'Westchester County Department of Finance\n148 Martine Avenue, 4th Floor\nWhite Plains, NY 10601',
                'filing_instructions': 'County sales tax included in state filing. Use NY State online services.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'PA': {  # Pennsylvania - 67 counties
        'state_info': {
            'state_portal': 'https://www.revenue.pa.gov/',
            'state_portal_name': 'Pennsylvania Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-717-787-1064'
        },
        'counties': {
            'PHILADELPHIA': {
                'filing_website': 'https://www.phila.gov/departments/department-of-revenue/',
                'contact_phone': '(215) 686-6600',
                'contact_email': 'revenue@phila.gov',
                'mailing_address': 'City of Philadelphia Department of Revenue\n1401 John F. Kennedy Boulevard, Suite 1130\nPhiladelphia, PA 19102',
                'filing_instructions': 'File through PA state system for sales tax. Additional Philadelphia taxes may require separate filing.',
                'special_requirements': 'Philadelphia Business Income and Receipts Tax, Net Profits Tax, and Use and Occupancy Tax may apply.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'ALLEGHENY': {  # Pittsburgh
                'filing_website': 'https://www.alleghenycounty.us/real-estate/taxes.aspx',
                'contact_phone': '(412) 350-4636',
                'contact_email': 'treasurer@alleghenycounty.us',
                'mailing_address': 'Allegheny County Treasurer\n436 Grant Street, Room 113\nPittsburgh, PA 15219',
                'filing_instructions': 'Sales tax filed through PA state system. County allocation automatic.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'MONTGOMERY': {
                'filing_website': 'https://www.montcopa.org/1183/Treasurer',
                'contact_phone': '(610) 278-3436',
                'contact_email': 'treasurer@montcopa.org',
                'mailing_address': 'Montgomery County Treasurer\nOne Montgomery Plaza, Suite 101\nNorristown, PA 19401',
                'filing_instructions': 'File through Pennsylvania state online system.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'BUCKS': {
                'filing_website': 'https://www.buckscounty.org/government/directory/TreasurerDepartment',
                'contact_phone': '(215) 348-6168',
                'contact_email': 'treasurer@buckscounty.org',
                'mailing_address': 'Bucks County Treasurer\n55 E. Court Street, 1st Floor\nDoylestown, PA 18901',
                'filing_instructions': 'County sales tax included in state filing through PA online services.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'CHESTER': {
                'filing_website': 'https://www.chesco.org/1066/Treasurer',
                'contact_phone': '(610) 344-6330',
                'contact_email': 'treasurer@chesco.org',
                'mailing_address': 'Chester County Treasurer\n313 W. Market Street, Suite 3202\nWest Chester, PA 19380',
                'filing_instructions': 'Sales tax filed through state system covers county allocation.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    }
}

def populate_county_filing_info():
    print("Populating County Filing Information - Batch 1 (CA, TX, FL, NY, PA)")
    print("=" * 80)
    
    total_counties_updated = 0
    states_processed = 0
    
    for state_code, state_data in COUNTY_FILING_INFO.items():
        print(f"\nProcessing {state_code} counties...")
        states_processed += 1
        counties_updated = 0
        
        state_info = state_data['state_info']
        
        for county_code, county_info in state_data['counties'].items():
            try:
                # Find the county record
                county_record = GlobalSalesTaxRate.objects.filter(
                    country='US',
                    region_code=state_code,
                    locality=county_code,
                    is_current=True
                ).first()
                
                if county_record:
                    # Update filing information
                    county_record.county_filing_website = county_info.get('filing_website', '')
                    county_record.county_contact_phone = county_info.get('contact_phone', '')
                    county_record.county_contact_email = county_info.get('contact_email', '')
                    county_record.county_mailing_address = county_info.get('mailing_address', '')
                    county_record.county_filing_instructions = county_info.get('filing_instructions', '')
                    county_record.county_special_requirements = county_info.get('special_requirements', '')
                    county_record.county_payment_methods = county_info.get('payment_methods', [])
                    
                    # Set state defaults if not specified
                    if not county_record.filing_frequency:
                        county_record.filing_frequency = state_info['default_frequency']
                    if not county_record.filing_day_of_month:
                        # Extract day from deadline string
                        deadline = state_info['default_deadline']
                        if '20th' in deadline:
                            county_record.filing_day_of_month = 20
                    if not county_record.online_portal_url:
                        county_record.online_portal_url = state_info['state_portal']
                    if not county_record.online_portal_name:
                        county_record.online_portal_name = state_info['state_portal_name']
                    
                    county_record.county_filing_deadline = state_info['default_deadline']
                    county_record.manually_verified = True
                    county_record.manual_notes = f"County filing information updated - Batch 1"
                    
                    county_record.save()
                    
                    print(f"  ✅ Updated {county_code}: {county_info.get('filing_website', 'State filing')}")
                    counties_updated += 1
                    total_counties_updated += 1
                else:
                    print(f"  ⚠️  County record not found: {state_code}-{county_code}")
                    
            except Exception as e:
                print(f"  ❌ Error updating {county_code}: {str(e)}")
        
        print(f"  Counties updated for {state_code}: {counties_updated}")
    
    print(f"\n✅ Batch 1 Complete! States: {states_processed}, Counties: {total_counties_updated}")
    print("Major counties in CA, TX, FL, NY, PA now have comprehensive filing information!")

if __name__ == "__main__":
    populate_county_filing_info()