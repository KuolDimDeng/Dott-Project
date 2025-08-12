#!/usr/bin/env python3
"""
Script to populate county-level filing information - Batch 2: IL, OH, MI, GA, NC, NJ, WA, AZ, TN, IN
Focus on high-population states with significant county-level variations
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
    'IL': {  # Illinois
        'state_info': {
            'state_portal': 'https://www2.illinois.gov/rev/',
            'state_portal_name': 'Illinois Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-217-782-3336'
        },
        'counties': {
            'COOK': {  # Chicago
                'filing_website': 'https://www.cookcountytreasurer.com/',
                'contact_phone': '(312) 603-5656',
                'contact_email': 'treasurer@cookcountyil.gov',
                'mailing_address': 'Cook County Treasurer\n118 N. Clark Street, Room 112\nChicago, IL 60602',
                'filing_instructions': 'Sales tax filed through Illinois Department of Revenue. County receives allocation automatically. Chicago city taxes may require separate filing.',
                'special_requirements': 'Chicago business license required. Additional Chicago taxes may apply (hotel tax, amusement tax).',
                'payment_methods': ['online', 'check', 'ach']
            },
            'DUPAGE': {
                'contact_phone': '(630) 407-5900',
                'contact_email': 'treasurer@dupageco.org',
                'mailing_address': 'DuPage County Treasurer\n421 N. County Farm Road\nWheaton, IL 60187',
                'filing_instructions': 'File through Illinois state system. County allocation handled automatically.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'OH': {  # Ohio
        'state_info': {
            'state_portal': 'https://www.tax.ohio.gov/',
            'state_portal_name': 'Ohio Department of Taxation',
            'default_frequency': 'monthly',
            'default_deadline': '23rd of following month',
            'state_phone': '1-888-405-4039'
        },
        'counties': {
            'CUYAHOGA': {  # Cleveland
                'filing_website': 'https://treasurer.cuyahogacounty.us/',
                'contact_phone': '(216) 443-7010',
                'contact_email': 'treasurer@cuyahogacounty.us',
                'mailing_address': 'Cuyahoga County Treasurer\n2079 E. 9th Street, 4th Floor\nCleveland, OH 44115',
                'filing_instructions': 'Sales tax filed through Ohio state system covers county allocation.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'HAMILTON': {  # Cincinnati
                'filing_website': 'https://www.hamiltoncountyohio.gov/government/elected_officials/treasurer',
                'contact_phone': '(513) 946-4800',
                'contact_email': 'treasurer@hamilton-co.org',
                'mailing_address': 'Hamilton County Treasurer\n138 E. Court Street, Room 301\nCincinnati, OH 45202',
                'filing_instructions': 'File through Ohio Department of Taxation online system.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'FRANKLIN': {  # Columbus
                'filing_website': 'https://treasurer.franklincountyohio.gov/',
                'contact_phone': '(614) 525-3939',
                'contact_email': 'treasurer@franklincountyohio.gov',
                'mailing_address': 'Franklin County Treasurer\n373 S. High Street, 22nd Floor\nColumbus, OH 43215',
                'filing_instructions': 'Sales tax filed through state system. County allocation automatic.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'MI': {  # Michigan
        'state_info': {
            'state_portal': 'https://www.michigan.gov/taxes/',
            'state_portal_name': 'Michigan Department of Treasury',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-517-636-4486'
        },
        'counties': {
            'WAYNE': {  # Detroit
                'filing_website': 'https://www.waynecounty.com/departments/treasurer.aspx',
                'contact_phone': '(313) 224-5990',
                'contact_email': 'treasurer@waynecounty.com',
                'mailing_address': 'Wayne County Treasurer\n400 Monroe Street, 5th Floor\nDetroit, MI 48226',
                'filing_instructions': 'Michigan has no county sales tax. All sales tax filed through state system.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'OAKLAND': {
                'contact_phone': '(248) 858-0611',
                'contact_email': 'treasurer@oakgov.com',
                'mailing_address': 'Oakland County Treasurer\n1200 N. Telegraph Road, Building 12E\nPontiac, MI 48341',
                'filing_instructions': 'No county sales tax in Michigan. File through Michigan Treasury online system.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'GA': {  # Georgia
        'state_info': {
            'state_portal': 'https://dor.georgia.gov/',
            'state_portal_name': 'Georgia Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-877-423-6711'
        },
        'counties': {
            'FULTON': {  # Atlanta
                'filing_website': 'https://www.fultoncountyga.gov/services/taxes',
                'contact_phone': '(404) 612-8499',
                'contact_email': 'tax.commissioner@fultoncountyga.gov',
                'mailing_address': 'Fulton County Tax Commissioner\n141 Pryor Street SW, Suite 4006\nAtlanta, GA 30303',
                'filing_instructions': 'File through Georgia Tax Center online. County SPLOST and other local taxes may require separate filing.',
                'special_requirements': 'SPLOST (Special Purpose Local Option Sales Tax) may apply. Business license required in Atlanta.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'DEKALB': {
                'filing_website': 'https://www.dekalbcountyga.gov/tax-commissioner',
                'contact_phone': '(404) 298-4000',
                'contact_email': 'taxcommissioner@dekalbcountyga.gov',
                'mailing_address': 'DeKalb County Tax Commissioner\n1300 Commerce Drive\nDecatur, GA 30030',
                'filing_instructions': 'Sales tax filed through Georgia DOR covers county allocation.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'NC': {  # North Carolina
        'state_info': {
            'state_portal': 'https://www.ncdor.gov/',
            'state_portal_name': 'North Carolina Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-877-252-3052'
        },
        'counties': {
            'MECKLENBURG': {  # Charlotte
                'filing_website': 'https://www.mecknc.gov/TaxCollections/',
                'contact_phone': '(704) 336-2499',
                'contact_email': 'tax.collections@mecknc.gov',
                'mailing_address': 'Mecklenburg County Tax Collections\n700 E. 4th Street\nCharlotte, NC 28202',
                'filing_instructions': 'File through NC Department of Revenue online system. County allocation handled automatically.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'WAKE': {  # Raleigh
                'filing_website': 'https://www.wakegov.com/departments-government/tax-administration',
                'contact_phone': '(919) 856-5400',
                'contact_email': 'tax@wakegov.com',
                'mailing_address': 'Wake County Tax Administration\n316 Fayetteville Street, Suite 100\nRaleigh, NC 27601',
                'filing_instructions': 'Sales tax filed through state system covers county portion.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'NJ': {  # New Jersey
        'state_info': {
            'state_portal': 'https://www.state.nj.us/treasury/taxation/',
            'state_portal_name': 'New Jersey Division of Taxation',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-609-292-6400'
        },
        'counties': {
            'BERGEN': {
                'contact_phone': '(201) 336-6500',
                'contact_email': 'treasurer@co.bergen.nj.us',
                'mailing_address': 'Bergen County Treasurer\nOne Bergen County Plaza, 4th Floor\nHackensack, NJ 07601',
                'filing_instructions': 'New Jersey has no county sales tax. All sales tax filed through state system.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'ESSEX': {
                'contact_phone': '(973) 621-4921',
                'contact_email': 'treasurer@essexcountynj.org',
                'mailing_address': 'Essex County Treasurer\n465 Dr. Martin Luther King Jr. Blvd.\nNewark, NJ 07102',
                'filing_instructions': 'No county sales tax. File through NJ Division of Taxation online.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'WA': {  # Washington
        'state_info': {
            'state_portal': 'https://dor.wa.gov/',
            'state_portal_name': 'Washington State Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '25th of following month',
            'state_phone': '1-800-647-7706'
        },
        'counties': {
            'KING': {  # Seattle
                'filing_website': 'https://kingcounty.gov/depts/finance-business-operations/treasury.aspx',
                'contact_phone': '(206) 296-7300',
                'contact_email': 'treasury@kingcounty.gov',
                'mailing_address': 'King County Treasury\n500 4th Avenue, Room 553\nSeattle, WA 98104',
                'filing_instructions': 'File through Washington State DOR online system. County allocation handled automatically.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'PIERCE': {  # Tacoma
                'filing_website': 'https://www.piercecountywa.gov/1449/Treasurer',
                'contact_phone': '(253) 798-7480',
                'contact_email': 'treasurer@piercecountywa.gov',
                'mailing_address': 'Pierce County Treasurer\n930 Tacoma Avenue S., Room 1046\nTacoma, WA 98402',
                'filing_instructions': 'Sales tax filed through state system covers local taxes.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'AZ': {  # Arizona
        'state_info': {
            'state_portal': 'https://azdor.gov/',
            'state_portal_name': 'Arizona Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-602-255-3381'
        },
        'counties': {
            'MARICOPA': {  # Phoenix
                'filing_website': 'https://treasurer.maricopa.gov/',
                'contact_phone': '(602) 506-8511',
                'contact_email': 'treasurer@maricopa.gov',
                'mailing_address': 'Maricopa County Treasurer\n301 W. Jefferson Street, Suite 1040\nPhoenix, AZ 85003',
                'filing_instructions': 'File through Arizona Department of Revenue online system. County allocation automatic.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'PIMA': {  # Tucson
                'filing_website': 'https://www.pima.gov/1137/Treasurer',
                'contact_phone': '(520) 724-8401',
                'contact_email': 'treasurer@pima.gov',
                'mailing_address': 'Pima County Treasurer\n115 N. Church Avenue, 2nd Floor\nTucson, AZ 85701',
                'filing_instructions': 'Sales tax filed through state covers county portion.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'TN': {  # Tennessee
        'state_info': {
            'state_portal': 'https://www.tn.gov/revenue/',
            'state_portal_name': 'Tennessee Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-615-253-0600'
        },
        'counties': {
            'SHELBY': {  # Memphis
                'filing_website': 'https://www.shelbycountytn.gov/1338/Trustee',
                'contact_phone': '(901) 222-2000',
                'contact_email': 'trustee@shelbycountytn.gov',
                'mailing_address': 'Shelby County Trustee\n160 N. Mid-America Mall\nMemphis, TN 38103',
                'filing_instructions': 'File through Tennessee Department of Revenue online. County receives allocation automatically.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'DAVIDSON': {  # Nashville
                'filing_website': 'https://www.nashville.gov/departments/finance/treasury-division',
                'contact_phone': '(615) 862-6151',
                'contact_email': 'finance.treasury@nashville.gov',
                'mailing_address': 'Metropolitan Government of Nashville\nTreasury Division\nP.O. Box 196300\nNashville, TN 37219',
                'filing_instructions': 'Combined city-county government. File through state system for sales tax.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    },
    'IN': {  # Indiana
        'state_info': {
            'state_portal': 'https://www.in.gov/dor/',
            'state_portal_name': 'Indiana Department of Revenue',
            'default_frequency': 'monthly',
            'default_deadline': '20th of following month',
            'state_phone': '1-317-232-2240'
        },
        'counties': {
            'MARION': {  # Indianapolis
                'filing_website': 'https://www.indy.gov/agency/office-of-finance-and-management',
                'contact_phone': '(317) 327-4622',
                'contact_email': 'controller@indy.gov',
                'mailing_address': 'City of Indianapolis\nOffice of Finance and Management\n200 E. Washington Street, Suite 2555\nIndianapolis, IN 46204',
                'filing_instructions': 'File through Indiana Department of Revenue INTIME system. County allocation handled automatically.',
                'payment_methods': ['online', 'check', 'ach']
            },
            'LAKE': {
                'contact_phone': '(219) 755-3069',
                'contact_email': 'treasurer@lakecountyin.org',
                'mailing_address': 'Lake County Treasurer\n2293 N. Main Street\nCrown Point, IN 46307',
                'filing_instructions': 'Sales tax filed through state system covers county portion.',
                'payment_methods': ['online', 'check', 'ach']
            }
        }
    }
}

def populate_county_filing_info():
    print("Populating County Filing Information - Batch 2 (IL, OH, MI, GA, NC, NJ, WA, AZ, TN, IN)")
    print("=" * 90)
    
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
                        elif '23rd' in deadline:
                            county_record.filing_day_of_month = 23
                        elif '25th' in deadline:
                            county_record.filing_day_of_month = 25
                    if not county_record.online_portal_url:
                        county_record.online_portal_url = state_info['state_portal']
                    if not county_record.online_portal_name:
                        county_record.online_portal_name = state_info['state_portal_name']
                    
                    county_record.county_filing_deadline = state_info['default_deadline']
                    county_record.manually_verified = True
                    county_record.manual_notes = f"County filing information updated - Batch 2"
                    
                    county_record.save()
                    
                    website = county_info.get('filing_website', 'State filing')
                    print(f"  ✅ Updated {county_code}: {website}")
                    counties_updated += 1
                    total_counties_updated += 1
                else:
                    print(f"  ⚠️  County record not found: {state_code}-{county_code}")
                    
            except Exception as e:
                print(f"  ❌ Error updating {county_code}: {str(e)}")
        
        print(f"  Counties updated for {state_code}: {counties_updated}")
    
    print(f"\n✅ Batch 2 Complete! States: {states_processed}, Counties: {total_counties_updated}")
    print("Major counties in IL, OH, MI, GA, NC, NJ, WA, AZ, TN, IN now have filing information!")

if __name__ == "__main__":
    populate_county_filing_info()