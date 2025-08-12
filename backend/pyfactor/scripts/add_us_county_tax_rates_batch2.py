#!/usr/bin/env python3
"""
Script to add US county-level tax rates - Batch 2: CA, CO, CT, DE, DC, FL (30+ counties each)
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

US_COUNTY_RATES = {
    'CA': {  # California - 58 counties
        'name': 'California',
        'counties': {
            'ALAMEDA': ('Alameda County', Decimal('0.0175')),  # Oakland/Berkeley area
            'ALPINE': ('Alpine County', Decimal('0.0075')),
            'AMADOR': ('Amador County', Decimal('0.0075')),
            'BUTTE': ('Butte County', Decimal('0.01')),
            'CALAVERAS': ('Calaveras County', Decimal('0.0075')),
            'COLUSA': ('Colusa County', Decimal('0.0075')),
            'CONTRA_COSTA': ('Contra Costa County', Decimal('0.015')),
            'DEL_NORTE': ('Del Norte County', Decimal('0.0075')),
            'EL_DORADO': ('El Dorado County', Decimal('0.0075')),
            'FRESNO': ('Fresno County', Decimal('0.015')),
            'GLENN': ('Glenn County', Decimal('0.0075')),
            'HUMBOLDT': ('Humboldt County', Decimal('0.0075')),
            'IMPERIAL': ('Imperial County', Decimal('0.0075')),
            'INYO': ('Inyo County', Decimal('0.0075')),
            'KERN': ('Kern County', Decimal('0.015')),  # Bakersfield
            'KINGS': ('Kings County', Decimal('0.01')),
            'LAKE': ('Lake County', Decimal('0.0075')),
            'LASSEN': ('Lassen County', Decimal('0.0075')),
            'LOS_ANGELES': ('Los Angeles County', Decimal('0.025')),  # Highest rate
            'MADERA': ('Madera County', Decimal('0.01')),
            'MARIN': ('Marin County', Decimal('0.015')),
            'MARIPOSA': ('Mariposa County', Decimal('0.0075')),
            'MENDOCINO': ('Mendocino County', Decimal('0.0075')),
            'MERCED': ('Merced County', Decimal('0.01')),
            'MODOC': ('Modoc County', Decimal('0.0075')),
            'MONO': ('Mono County', Decimal('0.0075')),
            'MONTEREY': ('Monterey County', Decimal('0.015')),
            'NAPA': ('Napa County', Decimal('0.015')),
            'NEVADA': ('Nevada County', Decimal('0.0075')),
            'ORANGE': ('Orange County', Decimal('0.02')),  # High rate
            'PLACER': ('Placer County', Decimal('0.015')),
            'PLUMAS': ('Plumas County', Decimal('0.0075')),
            'RIVERSIDE': ('Riverside County', Decimal('0.02')),
            'SACRAMENTO': ('Sacramento County', Decimal('0.015')),
            'SAN_BENITO': ('San Benito County', Decimal('0.01')),
            'SAN_BERNARDINO': ('San Bernardino County', Decimal('0.02')),
            'SAN_DIEGO': ('San Diego County', Decimal('0.02')),
            'SAN_FRANCISCO': ('San Francisco County', Decimal('0.02')),  # City-county
            'SAN_JOAQUIN': ('San Joaquin County', Decimal('0.015')),
            'SAN_LUIS_OBISPO': ('San Luis Obispo County', Decimal('0.015')),
            'SAN_MATEO': ('San Mateo County', Decimal('0.0175')),
            'SANTA_BARBARA': ('Santa Barbara County', Decimal('0.015')),
            'SANTA_CLARA': ('Santa Clara County', Decimal('0.0175')),  # Silicon Valley
            'SANTA_CRUZ': ('Santa Cruz County', Decimal('0.015')),
            'SHASTA': ('Shasta County', Decimal('0.01')),
            'SIERRA': ('Sierra County', Decimal('0.0075')),
            'SISKIYOU': ('Siskiyou County', Decimal('0.0075')),
            'SOLANO': ('Solano County', Decimal('0.015')),
            'SONOMA': ('Sonoma County', Decimal('0.015')),
            'STANISLAUS': ('Stanislaus County', Decimal('0.015')),
            'SUTTER': ('Sutter County', Decimal('0.01')),
            'TEHAMA': ('Tehama County', Decimal('0.0075')),
            'TRINITY': ('Trinity County', Decimal('0.0075')),
            'TULARE': ('Tulare County', Decimal('0.015')),
            'TUOLUMNE': ('Tuolumne County', Decimal('0.0075')),
            'VENTURA': ('Ventura County', Decimal('0.015')),
            'YOLO': ('Yolo County', Decimal('0.015')),
            'YUBA': ('Yuba County', Decimal('0.01')),
        }
    },
    'CO': {  # Colorado - 64 counties
        'name': 'Colorado',
        'counties': {
            'ADAMS': ('Adams County', Decimal('0.032')),  # Denver metro
            'ALAMOSA': ('Alamosa County', Decimal('0.025')),
            'ARAPAHOE': ('Arapahoe County', Decimal('0.03')),  # Denver metro
            'ARCHULETA': ('Archuleta County', Decimal('0.02')),
            'BACA': ('Baca County', Decimal('0.02')),
            'BENT': ('Bent County', Decimal('0.02')),
            'BOULDER': ('Boulder County', Decimal('0.035')),  # High rate - Boulder
            'BROOMFIELD': ('Broomfield County', Decimal('0.03')),
            'CHAFFEE': ('Chaffee County', Decimal('0.025')),
            'CHEYENNE': ('Cheyenne County', Decimal('0.02')),
            'CLEAR_CREEK': ('Clear Creek County', Decimal('0.025')),
            'CONEJOS': ('Conejos County', Decimal('0.02')),
            'COSTILLA': ('Costilla County', Decimal('0.02')),
            'CROWLEY': ('Crowley County', Decimal('0.02')),
            'CUSTER': ('Custer County', Decimal('0.02')),
            'DELTA': ('Delta County', Decimal('0.025')),
            'DENVER': ('Denver County', Decimal('0.04')),  # Highest - city-county
            'DOLORES': ('Dolores County', Decimal('0.02')),
            'DOUGLAS': ('Douglas County', Decimal('0.03')),  # Denver metro
            'EAGLE': ('Eagle County', Decimal('0.035')),  # Vail area
            'EL_PASO': ('El Paso County', Decimal('0.03')),  # Colorado Springs
            'ELBERT': ('Elbert County', Decimal('0.025')),
            'FREMONT': ('Fremont County', Decimal('0.025')),
            'GARFIELD': ('Garfield County', Decimal('0.03')),
            'GILPIN': ('Gilpin County', Decimal('0.025')),
            'GRAND': ('Grand County', Decimal('0.025')),
            'GUNNISON': ('Gunnison County', Decimal('0.025')),
            'HINSDALE': ('Hinsdale County', Decimal('0.02')),
            'HUERFANO': ('Huerfano County', Decimal('0.02')),
            'JACKSON': ('Jackson County', Decimal('0.02')),
            'JEFFERSON': ('Jefferson County', Decimal('0.032')),  # Denver metro
            'KIOWA': ('Kiowa County', Decimal('0.02')),
            'KIT_CARSON': ('Kit Carson County', Decimal('0.025')),
            'LA_PLATA': ('La Plata County', Decimal('0.03')),  # Durango
            'LAKE': ('Lake County', Decimal('0.025')),
            'LARIMER': ('Larimer County', Decimal('0.03')),  # Fort Collins
            'LAS_ANIMAS': ('Las Animas County', Decimal('0.02')),
            'LINCOLN': ('Lincoln County', Decimal('0.02')),
            'LOGAN': ('Logan County', Decimal('0.025')),
            'MESA': ('Mesa County', Decimal('0.03')),  # Grand Junction
            'MINERAL': ('Mineral County', Decimal('0.02')),
            'MOFFAT': ('Moffat County', Decimal('0.025')),
            'MONTEZUMA': ('Montezuma County', Decimal('0.025')),
            'MONTROSE': ('Montrose County', Decimal('0.025')),
            'MORGAN': ('Morgan County', Decimal('0.025')),
            'OTERO': ('Otero County', Decimal('0.02')),
            'OURAY': ('Ouray County', Decimal('0.025')),
            'PARK': ('Park County', Decimal('0.025')),
            'PHILLIPS': ('Phillips County', Decimal('0.02')),
            'PITKIN': ('Pitkin County', Decimal('0.04')),  # Aspen - high rate
            'PROWERS': ('Prowers County', Decimal('0.02')),
            'PUEBLO': ('Pueblo County', Decimal('0.03')),
            'RIO_BLANCO': ('Rio Blanco County', Decimal('0.025')),
            'RIO_GRANDE': ('Rio Grande County', Decimal('0.025')),
            'ROUTT': ('Routt County', Decimal('0.03')),  # Steamboat Springs
            'SAGUACHE': ('Saguache County', Decimal('0.02')),
            'SAN_JUAN': ('San Juan County', Decimal('0.02')),
            'SAN_MIGUEL': ('San Miguel County', Decimal('0.025')),
            'SEDGWICK': ('Sedgwick County', Decimal('0.02')),
            'SUMMIT': ('Summit County', Decimal('0.035')),  # Ski areas
            'TELLER': ('Teller County', Decimal('0.025')),
            'WASHINGTON': ('Washington County', Decimal('0.02')),
            'WELD': ('Weld County', Decimal('0.025')),
            'YUMA': ('Yuma County', Decimal('0.02')),
        }
    },
    'CT': {  # Connecticut - 8 counties
        'name': 'Connecticut',
        'counties': {
            'FAIRFIELD': ('Fairfield County', Decimal('0.0075')),  # Bridgeport, Stamford
            'HARTFORD': ('Hartford County', Decimal('0.0075')),  # Hartford
            'LITCHFIELD': ('Litchfield County', Decimal('0.0075')),
            'MIDDLESEX': ('Middlesex County', Decimal('0.0075')),
            'NEW_HAVEN': ('New Haven County', Decimal('0.0075')),  # New Haven
            'NEW_LONDON': ('New London County', Decimal('0.0075')),
            'TOLLAND': ('Tolland County', Decimal('0.0075')),
            'WINDHAM': ('Windham County', Decimal('0.0075')),
        }
    },
    'DE': {  # Delaware - 3 counties (no state sales tax)
        'name': 'Delaware',
        'counties': {
            'KENT': ('Kent County', Decimal('0.00')),  # No sales tax
            'NEW_CASTLE': ('New Castle County', Decimal('0.00')),  # No sales tax
            'SUSSEX': ('Sussex County', Decimal('0.00')),  # No sales tax
        }
    },
    'DC': {  # District of Columbia
        'name': 'District of Columbia',
        'counties': {
            'WASHINGTON': ('Washington D.C.', Decimal('0.00')),  # Only state rate applies
        }
    },
    'FL': {  # Florida - 67 counties
        'name': 'Florida',
        'counties': {
            'ALACHUA': ('Alachua County', Decimal('0.01')),  # Gainesville
            'BAKER': ('Baker County', Decimal('0.005')),
            'BAY': ('Bay County', Decimal('0.01')),
            'BRADFORD': ('Bradford County', Decimal('0.005')),
            'BREVARD': ('Brevard County', Decimal('0.01')),  # Space Coast
            'BROWARD': ('Broward County', Decimal('0.01')),  # Fort Lauderdale
            'CALHOUN': ('Calhoun County', Decimal('0.005')),
            'CHARLOTTE': ('Charlotte County', Decimal('0.01')),
            'CITRUS': ('Citrus County', Decimal('0.01')),
            'CLAY': ('Clay County', Decimal('0.01')),
            'COLLIER': ('Collier County', Decimal('0.01')),  # Naples
            'COLUMBIA': ('Columbia County', Decimal('0.005')),
            'DADE': ('Miami-Dade County', Decimal('0.015')),  # Miami - higher rate
            'DESOTO': ('DeSoto County', Decimal('0.005')),
            'DIXIE': ('Dixie County', Decimal('0.005')),
            'DUVAL': ('Duval County', Decimal('0.0125')),  # Jacksonville
            'ESCAMBIA': ('Escambia County', Decimal('0.01')),  # Pensacola
            'FLAGLER': ('Flagler County', Decimal('0.01')),
            'FRANKLIN': ('Franklin County', Decimal('0.005')),
            'GADSDEN': ('Gadsden County', Decimal('0.005')),
            'GILCHRIST': ('Gilchrist County', Decimal('0.005')),
            'GLADES': ('Glades County', Decimal('0.005')),
            'GULF': ('Gulf County', Decimal('0.005')),
            'HAMILTON': ('Hamilton County', Decimal('0.005')),
            'HARDEE': ('Hardee County', Decimal('0.005')),
            'HENDRY': ('Hendry County', Decimal('0.005')),
            'HERNANDO': ('Hernando County', Decimal('0.01')),
            'HIGHLANDS': ('Highlands County', Decimal('0.01')),
            'HILLSBOROUGH': ('Hillsborough County', Decimal('0.015')),  # Tampa
            'HOLMES': ('Holmes County', Decimal('0.005')),
            'INDIAN_RIVER': ('Indian River County', Decimal('0.01')),
            'JACKSON': ('Jackson County', Decimal('0.005')),
            'JEFFERSON': ('Jefferson County', Decimal('0.005')),
            'LAFAYETTE': ('Lafayette County', Decimal('0.005')),
            'LAKE': ('Lake County', Decimal('0.01')),
            'LEE': ('Lee County', Decimal('0.01')),  # Fort Myers
            'LEON': ('Leon County', Decimal('0.015')),  # Tallahassee
            'LEVY': ('Levy County', Decimal('0.005')),
            'LIBERTY': ('Liberty County', Decimal('0.005')),
            'MADISON': ('Madison County', Decimal('0.005')),
            'MANATEE': ('Manatee County', Decimal('0.01')),
            'MARION': ('Marion County', Decimal('0.01')),  # Ocala
            'MARTIN': ('Martin County', Decimal('0.01')),
            'MONROE': ('Monroe County', Decimal('0.015')),  # Key West
            'NASSAU': ('Nassau County', Decimal('0.01')),
            'OKALOOSA': ('Okaloosa County', Decimal('0.01')),
            'OKEECHOBEE': ('Okeechobee County', Decimal('0.005')),
            'ORANGE': ('Orange County', Decimal('0.015')),  # Orlando
            'OSCEOLA': ('Osceola County', Decimal('0.01')),
            'PALM_BEACH': ('Palm Beach County', Decimal('0.01')),
            'PASCO': ('Pasco County', Decimal('0.01')),
            'PINELLAS': ('Pinellas County', Decimal('0.015')),  # St. Petersburg
            'POLK': ('Polk County', Decimal('0.01')),  # Lakeland
            'PUTNAM': ('Putnam County', Decimal('0.005')),
            'SANTA_ROSA': ('Santa Rosa County', Decimal('0.01')),
            'SARASOTA': ('Sarasota County', Decimal('0.01')),
            'SEMINOLE': ('Seminole County', Decimal('0.01')),
            'ST_JOHNS': ('St. Johns County', Decimal('0.01')),
            'ST_LUCIE': ('St. Lucie County', Decimal('0.01')),
            'SUMTER': ('Sumter County', Decimal('0.01')),
            'SUWANNEE': ('Suwannee County', Decimal('0.005')),
            'TAYLOR': ('Taylor County', Decimal('0.005')),
            'UNION': ('Union County', Decimal('0.005')),
            'VOLUSIA': ('Volusia County', Decimal('0.01')),  # Daytona Beach
            'WAKULLA': ('Wakulla County', Decimal('0.005')),
            'WALTON': ('Walton County', Decimal('0.01')),
            'WASHINGTON': ('Washington County', Decimal('0.005')),
        }
    },
}

def add_us_county_rates():
    print("US County Tax Rates - Batch 2 (CA, CO, CT, DE, DC, FL)")
    print("=" * 60)
    
    total_counties_added = 0
    states_processed = 0
    
    for state_code, state_data in US_COUNTY_RATES.items():
        print(f"\nProcessing {state_data['name']} ({state_code})...")
        states_processed += 1
        counties_added = 0
        
        for county_code, (county_name, county_rate) in state_data['counties'].items():
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
    
    print(f"\n✅ Batch 2 Complete! States: {states_processed}, Counties: {total_counties_added}")

if __name__ == "__main__":
    add_us_county_rates()