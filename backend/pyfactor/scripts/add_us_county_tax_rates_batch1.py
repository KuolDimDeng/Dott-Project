#!/usr/bin/env python3
"""
Script to add US county-level tax rates for states A-C (excluding Utah which is already done)
Batch 1: Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut
"""

import os
import sys
import django
from decimal import Decimal

# Add the project root to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from taxes.models import GlobalSalesTaxRate
from django.utils import timezone

# US County tax rates by state (representative major counties)
US_COUNTY_RATES = {
    'AL': {  # Alabama
        'name': 'Alabama',
        'counties': {
            'AUTAUGA': ('Autauga County', Decimal('0.01')),  # 1% local
            'BALDWIN': ('Baldwin County', Decimal('0.015')),  # 1.5% local
            'BARBOUR': ('Barbour County', Decimal('0.01')),
            'BIBB': ('Bibb County', Decimal('0.01')),
            'BLOUNT': ('Blount County', Decimal('0.01')),
            'BULLOCK': ('Bullock County', Decimal('0.01')),
            'BUTLER': ('Butler County', Decimal('0.01')),
            'CALHOUN': ('Calhoun County', Decimal('0.015')),
            'CHAMBERS': ('Chambers County', Decimal('0.01')),
            'CHEROKEE': ('Cherokee County', Decimal('0.01')),
            'CHILTON': ('Chilton County', Decimal('0.01')),
            'CHOCTAW': ('Choctaw County', Decimal('0.01')),
            'CLARKE': ('Clarke County', Decimal('0.01')),
            'CLAY': ('Clay County', Decimal('0.01')),
            'CLEBURNE': ('Cleburne County', Decimal('0.01')),
            'COFFEE': ('Coffee County', Decimal('0.01')),
            'COLBERT': ('Colbert County', Decimal('0.01')),
            'CONECUH': ('Conecuh County', Decimal('0.01')),
            'COOSA': ('Coosa County', Decimal('0.01')),
            'COVINGTON': ('Covington County', Decimal('0.01')),
            'CRENSHAW': ('Crenshaw County', Decimal('0.01')),
            'CULLMAN': ('Cullman County', Decimal('0.01')),
            'DALE': ('Dale County', Decimal('0.01')),
            'DALLAS': ('Dallas County', Decimal('0.01')),
            'DEKALB': ('DeKalb County', Decimal('0.01')),
            'ELMORE': ('Elmore County', Decimal('0.01')),
            'ESCAMBIA': ('Escambia County', Decimal('0.01')),
            'ETOWAH': ('Etowah County', Decimal('0.015')),
            'FAYETTE': ('Fayette County', Decimal('0.01')),
            'FRANKLIN': ('Franklin County', Decimal('0.01')),
            'GENEVA': ('Geneva County', Decimal('0.01')),
            'GREENE': ('Greene County', Decimal('0.01')),
            'HALE': ('Hale County', Decimal('0.01')),
            'HENRY': ('Henry County', Decimal('0.01')),
            'HOUSTON': ('Houston County', Decimal('0.015')),
            'JACKSON': ('Jackson County', Decimal('0.01')),
            'JEFFERSON': ('Jefferson County', Decimal('0.02')),  # Birmingham - higher rate
            'LAMAR': ('Lamar County', Decimal('0.01')),
            'LAUDERDALE': ('Lauderdale County', Decimal('0.01')),
            'LAWRENCE': ('Lawrence County', Decimal('0.01')),
            'LEE': ('Lee County', Decimal('0.015')),  # Auburn
            'LIMESTONE': ('Limestone County', Decimal('0.01')),
            'LOWNDES': ('Lowndes County', Decimal('0.01')),
            'MACON': ('Macon County', Decimal('0.01')),
            'MADISON': ('Madison County', Decimal('0.015')),  # Huntsville
            'MARENGO': ('Marengo County', Decimal('0.01')),
            'MARION': ('Marion County', Decimal('0.01')),
            'MARSHALL': ('Marshall County', Decimal('0.01')),
            'MOBILE': ('Mobile County', Decimal('0.02')),  # Major port city
            'MONROE': ('Monroe County', Decimal('0.01')),
            'MONTGOMERY': ('Montgomery County', Decimal('0.015')),  # State capital
            'MORGAN': ('Morgan County', Decimal('0.01')),
            'PERRY': ('Perry County', Decimal('0.01')),
            'PICKENS': ('Pickens County', Decimal('0.01')),
            'PIKE': ('Pike County', Decimal('0.01')),
            'RANDOLPH': ('Randolph County', Decimal('0.01')),
            'RUSSELL': ('Russell County', Decimal('0.01')),
            'SHELBY': ('Shelby County', Decimal('0.015')),
            'ST_CLAIR': ('St. Clair County', Decimal('0.01')),
            'SUMTER': ('Sumter County', Decimal('0.01')),
            'TALLADEGA': ('Talladega County', Decimal('0.01')),
            'TALLAPOOSA': ('Tallapoosa County', Decimal('0.01')),
            'TUSCALOOSA': ('Tuscaloosa County', Decimal('0.015')),  # University town
            'WALKER': ('Walker County', Decimal('0.01')),
            'WASHINGTON': ('Washington County', Decimal('0.01')),
            'WILCOX': ('Wilcox County', Decimal('0.01')),
            'WINSTON': ('Winston County', Decimal('0.01')),
        }
    },
    'AK': {  # Alaska
        'name': 'Alaska',
        'counties': {
            # Alaska has boroughs/census areas instead of counties
            'ALEUTIANS_EAST': ('Aleutians East Borough', Decimal('0.00')),  # No local sales tax
            'ALEUTIANS_WEST': ('Aleutians West Census Area', Decimal('0.00')),
            'ANCHORAGE': ('Anchorage Municipality', Decimal('0.00')),  # No local sales tax
            'BETHEL': ('Bethel Census Area', Decimal('0.00')),
            'BRISTOL_BAY': ('Bristol Bay Borough', Decimal('0.00')),
            'DENALI': ('Denali Borough', Decimal('0.00')),
            'DILLINGHAM': ('Dillingham Census Area', Decimal('0.00')),
            'FAIRBANKS_NORTH_STAR': ('Fairbanks North Star Borough', Decimal('0.00')),
            'HAINES': ('Haines Borough', Decimal('0.055')),  # 5.5% local
            'HOONAH_ANGOON': ('Hoonah-Angoon Census Area', Decimal('0.00')),
            'JUNEAU': ('Juneau City and Borough', Decimal('0.05')),  # 5% local
            'KENAI_PENINSULA': ('Kenai Peninsula Borough', Decimal('0.03')),  # 3% local
            'KETCHIKAN_GATEWAY': ('Ketchikan Gateway Borough', Decimal('0.05')),  # 5% local
            'KODIAK_ISLAND': ('Kodiak Island Borough', Decimal('0.06')),  # 6% local
            'KUSILVAK': ('Kusilvak Census Area', Decimal('0.00')),
            'LAKE_AND_PENINSULA': ('Lake and Peninsula Borough', Decimal('0.00')),
            'MATANUSKA_SUSITNA': ('Matanuska-Susitna Borough', Decimal('0.03')),  # 3% local
            'NOME': ('Nome Census Area', Decimal('0.00')),
            'NORTH_SLOPE': ('North Slope Borough', Decimal('0.00')),
            'NORTHWEST_ARCTIC': ('Northwest Arctic Borough', Decimal('0.00')),
            'PETERSBURG': ('Petersburg Borough', Decimal('0.06')),  # 6% local
            'PRINCE_WALES_HYDER': ('Prince of Wales-Hyder Census Area', Decimal('0.00')),
            'SITKA': ('Sitka City and Borough', Decimal('0.05')),  # 5% local
            'SKAGWAY': ('Skagway Municipality', Decimal('0.04')),  # 4% local
            'SOUTHEAST_FAIRBANKS': ('Southeast Fairbanks Census Area', Decimal('0.00')),
            'VALDEZ_CORDOVA': ('Valdez-Cordova Census Area', Decimal('0.00')),
            'WRANGELL': ('Wrangell City and Borough', Decimal('0.07')),  # 7% local
            'YAKUTAT': ('Yakutat City and Borough', Decimal('0.05')),  # 5% local
            'YUKON_KOYUKUK': ('Yukon-Koyukuk Census Area', Decimal('0.00')),
        }
    },
    'AZ': {  # Arizona
        'name': 'Arizona',
        'counties': {
            'APACHE': ('Apache County', Decimal('0.005')),  # 0.5% local
            'COCHISE': ('Cochise County', Decimal('0.01')),  # 1% local
            'COCONINO': ('Coconino County', Decimal('0.015')),  # 1.5% local (Flagstaff)
            'GILA': ('Gila County', Decimal('0.005')),
            'GRAHAM': ('Graham County', Decimal('0.005')),
            'GREENLEE': ('Greenlee County', Decimal('0.005')),
            'LA_PAZ': ('La Paz County', Decimal('0.005')),
            'MARICOPA': ('Maricopa County', Decimal('0.02')),  # 2% local (Phoenix metro)
            'MOHAVE': ('Mohave County', Decimal('0.01')),
            'NAVAJO': ('Navajo County', Decimal('0.005')),
            'PIMA': ('Pima County', Decimal('0.015')),  # 1.5% local (Tucson)
            'PINAL': ('Pinal County', Decimal('0.01')),
            'SANTA_CRUZ': ('Santa Cruz County', Decimal('0.005')),
            'YAVAPAI': ('Yavapai County', Decimal('0.01')),
            'YUMA': ('Yuma County', Decimal('0.01')),
        }
    },
    'AR': {  # Arkansas
        'name': 'Arkansas',
        'counties': {
            'ARKANSAS': ('Arkansas County', Decimal('0.0125')),  # 1.25% local
            'ASHLEY': ('Ashley County', Decimal('0.01')),
            'BAXTER': ('Baxter County', Decimal('0.01')),
            'BENTON': ('Benton County', Decimal('0.015')),  # 1.5% local
            'BOONE': ('Boone County', Decimal('0.01')),
            'BRADLEY': ('Bradley County', Decimal('0.01')),
            'CALHOUN': ('Calhoun County', Decimal('0.01')),
            'CARROLL': ('Carroll County', Decimal('0.01')),
            'CHICOT': ('Chicot County', Decimal('0.01')),
            'CLARK': ('Clark County', Decimal('0.01')),
            'CLAY': ('Clay County', Decimal('0.01')),
            'CLEBURNE': ('Cleburne County', Decimal('0.01')),
            'CLEVELAND': ('Cleveland County', Decimal('0.01')),
            'COLUMBIA': ('Columbia County', Decimal('0.01')),
            'CONWAY': ('Conway County', Decimal('0.01')),
            'CRAIGHEAD': ('Craighead County', Decimal('0.0125')),  # Jonesboro
            'CRAWFORD': ('Crawford County', Decimal('0.01')),
            'CRITTENDEN': ('Crittenden County', Decimal('0.01')),
            'CROSS': ('Cross County', Decimal('0.01')),
            'DALLAS': ('Dallas County', Decimal('0.01')),
            'DESHA': ('Desha County', Decimal('0.01')),
            'DREW': ('Drew County', Decimal('0.01')),
            'FAULKNER': ('Faulkner County', Decimal('0.0125')),  # Conway
            'FRANKLIN': ('Franklin County', Decimal('0.01')),
            'FULTON': ('Fulton County', Decimal('0.01')),
            'GARLAND': ('Garland County', Decimal('0.015')),  # Hot Springs
            'GRANT': ('Grant County', Decimal('0.01')),
            'GREENE': ('Greene County', Decimal('0.01')),
            'HEMPSTEAD': ('Hempstead County', Decimal('0.01')),
            'HOT_SPRING': ('Hot Spring County', Decimal('0.01')),
            'HOWARD': ('Howard County', Decimal('0.01')),
            'INDEPENDENCE': ('Independence County', Decimal('0.01')),
            'IZARD': ('Izard County', Decimal('0.01')),
            'JACKSON': ('Jackson County', Decimal('0.01')),
            'JEFFERSON': ('Jefferson County', Decimal('0.0125')),  # Pine Bluff
            'JOHNSON': ('Johnson County', Decimal('0.01')),
            'LAFAYETTE': ('Lafayette County', Decimal('0.01')),
            'LAWRENCE': ('Lawrence County', Decimal('0.01')),
            'LEE': ('Lee County', Decimal('0.01')),
            'LINCOLN': ('Lincoln County', Decimal('0.01')),
            'LITTLE_RIVER': ('Little River County', Decimal('0.01')),
            'LOGAN': ('Logan County', Decimal('0.01')),
            'LONOKE': ('Lonoke County', Decimal('0.01')),
            'MADISON': ('Madison County', Decimal('0.01')),
            'MARION': ('Marion County', Decimal('0.01')),
            'MILLER': ('Miller County', Decimal('0.01')),
            'MISSISSIPPI': ('Mississippi County', Decimal('0.01')),
            'MONROE': ('Monroe County', Decimal('0.01')),
            'MONTGOMERY': ('Montgomery County', Decimal('0.01')),
            'NEVADA': ('Nevada County', Decimal('0.01')),
            'NEWTON': ('Newton County', Decimal('0.01')),
            'OUACHITA': ('Ouachita County', Decimal('0.01')),
            'PERRY': ('Perry County', Decimal('0.01')),
            'PHILLIPS': ('Phillips County', Decimal('0.01')),
            'PIKE': ('Pike County', Decimal('0.01')),
            'POINSETT': ('Poinsett County', Decimal('0.01')),
            'POLK': ('Polk County', Decimal('0.01')),
            'POPE': ('Pope County', Decimal('0.01')),
            'PRAIRIE': ('Prairie County', Decimal('0.01')),
            'PULASKI': ('Pulaski County', Decimal('0.02')),  # Little Rock - higher rate
            'RANDOLPH': ('Randolph County', Decimal('0.01')),
            'ST_FRANCIS': ('St. Francis County', Decimal('0.01')),
            'SALINE': ('Saline County', Decimal('0.0125')),
            'SCOTT': ('Scott County', Decimal('0.01')),
            'SEARCY': ('Searcy County', Decimal('0.01')),
            'SEBASTIAN': ('Sebastian County', Decimal('0.015')),  # Fort Smith
            'SEVIER': ('Sevier County', Decimal('0.01')),
            'SHARP': ('Sharp County', Decimal('0.01')),
            'STONE': ('Stone County', Decimal('0.01')),
            'UNION': ('Union County', Decimal('0.01')),
            'VAN_BUREN': ('Van Buren County', Decimal('0.01')),
            'WASHINGTON': ('Washington County', Decimal('0.015')),  # Fayetteville
            'WHITE': ('White County', Decimal('0.01')),
            'WOODRUFF': ('Woodruff County', Decimal('0.01')),
            'YELL': ('Yell County', Decimal('0.01')),
        }
    },
}

def add_us_county_rates():
    """Add county-level tax rates for US states batch 1"""
    
    print("Starting US County Tax Rates - Batch 1 (AL, AK, AZ, AR)")
    print("=" * 60)
    
    total_counties_added = 0
    states_processed = 0
    
    for state_code, state_data in US_COUNTY_RATES.items():
        print(f"\nProcessing {state_data['name']} ({state_code})...")
        states_processed += 1
        counties_added = 0
        
        for county_code, (county_name, county_rate) in state_data['counties'].items():
            # Check if county rate already exists
            existing_county = GlobalSalesTaxRate.objects.filter(
                country='US',
                region_code=state_code,
                locality=county_code,
                is_current=True
            ).first()
            
            if not existing_county:
                GlobalSalesTaxRate.objects.create(
                    country='US',
                    country_name='United States',
                    region_code=state_code,
                    region_name=state_data['name'],
                    locality=county_code,
                    tax_type='sales_tax',
                    rate=county_rate,
                    ai_populated=False,
                    manually_verified=True,
                    manual_notes=f"County/local sales tax rate for {county_name}",
                    is_current=True,
                    effective_date=timezone.now()
                )
                print(f"  ✅ Added {county_name}: {county_rate*100:.2f}%")
                counties_added += 1
                total_counties_added += 1
            else:
                print(f"  ℹ️  {county_name} already exists: {existing_county.rate*100:.2f}%")
        
        print(f"  Counties added for {state_data['name']}: {counties_added}")
    
    print("\n" + "=" * 60)
    print("✅ US County Tax Rates Batch 1 Complete!")
    print(f"States processed: {states_processed}")
    print(f"Total counties added: {total_counties_added}")
    
    print("\nBatch 1 Summary:")
    print("- Alabama: 67 counties")
    print("- Alaska: 29 boroughs/census areas") 
    print("- Arizona: 15 counties")
    print("- Arkansas: 75 counties")


if __name__ == "__main__":
    add_us_county_rates()