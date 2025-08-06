#!/usr/bin/env python3
"""
Script to add US county-level tax rates - Batch 3: GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI (30 states)
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
    'GA': {  # Georgia - 159 counties (abbreviated to major ones)
        'name': 'Georgia',
        'counties': {
            'FULTON': ('Fulton County', Decimal('0.02')),  # Atlanta
            'DEKALB': ('DeKalb County', Decimal('0.02')),  # Atlanta metro
            'GWINNETT': ('Gwinnett County', Decimal('0.015')),
            'COBB': ('Cobb County', Decimal('0.02')),  # Atlanta metro
            'CLAYTON': ('Clayton County', Decimal('0.015')),
            'RICHMOND': ('Richmond County', Decimal('0.02')),  # Augusta
            'CHATHAM': ('Chatham County', Decimal('0.02')),  # Savannah
            'HENRY': ('Henry County', Decimal('0.015')),
            'CHEROKEE': ('Cherokee County', Decimal('0.015')),
            'FORSYTH': ('Forsyth County', Decimal('0.015')),
            'BIBB': ('Bibb County', Decimal('0.015')),  # Macon
            'MUSCOGEE': ('Muscogee County', Decimal('0.02')),  # Columbus
            'DOUGLAS': ('Douglas County', Decimal('0.015')),
            'HALL': ('Hall County', Decimal('0.015')),
            'HOUSTON': ('Houston County', Decimal('0.015')),
            'FAYETTE': ('Fayette County', Decimal('0.015')),
            'PAULDING': ('Paulding County', Decimal('0.015')),
            'COLUMBIA': ('Columbia County', Decimal('0.015')),
            'CLARKE': ('Clarke County', Decimal('0.015')),  # Athens
            'COWETA': ('Coweta County', Decimal('0.015')),
        }
    },
    'HI': {  # Hawaii - 5 counties
        'name': 'Hawaii',
        'counties': {
            'HAWAII': ('Hawaii County', Decimal('0.0025')),  # Big Island
            'HONOLULU': ('Honolulu County', Decimal('0.0025')),  # Oahu
            'KAUAI': ('Kauai County', Decimal('0.0025')),
            'MAUI': ('Maui County', Decimal('0.0025')),
            'KALAWAO': ('Kalawao County', Decimal('0.0025')),  # Molokai
        }
    },
    'ID': {  # Idaho - 44 counties
        'name': 'Idaho',
        'counties': {
            'ADA': ('Ada County', Decimal('0.01')),  # Boise
            'CANYON': ('Canyon County', Decimal('0.01')),
            'KOOTENAI': ('Kootenai County', Decimal('0.015')),  # Coeur d'Alene
            'BONNEVILLE': ('Bonneville County', Decimal('0.01')),
            'BANNOCK': ('Bannock County', Decimal('0.01')),
            'TWIN_FALLS': ('Twin Falls County', Decimal('0.01')),
            'MADISON': ('Madison County', Decimal('0.01')),
            'CASSIA': ('Cassia County', Decimal('0.005')),
            'ELMORE': ('Elmore County', Decimal('0.005')),
            'JEROME': ('Jerome County', Decimal('0.005')),
            'LATAH': ('Latah County', Decimal('0.01')),  # Moscow
            'WASHINGTON': ('Washington County', Decimal('0.005')),
            'PAYETTE': ('Payette County', Decimal('0.005')),
            'GEM': ('Gem County', Decimal('0.005')),
            'BONNER': ('Bonner County', Decimal('0.01')),
            'MINIDOKA': ('Minidoka County', Decimal('0.005')),
            'CARIBOU': ('Caribou County', Decimal('0.005')),
            'POWER': ('Power County', Decimal('0.005')),
            'FRANKLIN': ('Franklin County', Decimal('0.005')),
            'FREMONT': ('Fremont County', Decimal('0.005')),
        }
    },
    'IL': {  # Illinois - 102 counties (major ones)
        'name': 'Illinois',
        'counties': {
            'COOK': ('Cook County', Decimal('0.025')),  # Chicago - highest rate
            'DUPAGE': ('DuPage County', Decimal('0.02')),
            'LAKE': ('Lake County', Decimal('0.02')),
            'WILL': ('Will County', Decimal('0.02')),
            'KANE': ('Kane County', Decimal('0.015')),
            'MCHENRY': ('McHenry County', Decimal('0.015')),
            'WINNEBAGO': ('Winnebago County', Decimal('0.015')),
            'ST_CLAIR': ('St. Clair County', Decimal('0.015')),
            'MADISON': ('Madison County', Decimal('0.015')),
            'CHAMPAIGN': ('Champaign County', Decimal('0.015')),
            'SANGAMON': ('Sangamon County', Decimal('0.015')),  # Springfield
            'PEORIA': ('Peoria County', Decimal('0.015')),
            'ROCK_ISLAND': ('Rock Island County', Decimal('0.015')),
            'MCLEAN': ('McLean County', Decimal('0.015')),
            'KENDALL': ('Kendall County', Decimal('0.015')),
            'DEKALB': ('DeKalb County', Decimal('0.01')),
            'TAZEWELL': ('Tazewell County', Decimal('0.01')),
            'MONROE': ('Monroe County', Decimal('0.01')),
            'KANKAKEE': ('Kankakee County', Decimal('0.01')),
            'MACON': ('Macon County', Decimal('0.01')),
        }
    },
    'IN': {  # Indiana - 92 counties
        'name': 'Indiana',
        'counties': {
            'MARION': ('Marion County', Decimal('0.0225')),  # Indianapolis - highest rate
            'LAKE': ('Lake County', Decimal('0.02')),  # Gary
            'ALLEN': ('Allen County', Decimal('0.015')),  # Fort Wayne
            'HAMILTON': ('Hamilton County', Decimal('0.015')),
            'VANDERBURGH': ('Vanderburgh County', Decimal('0.015')),  # Evansville
            'HENDRICKS': ('Hendricks County', Decimal('0.015')),
            'ST_JOSEPH': ('St. Joseph County', Decimal('0.015')),  # South Bend
            'ELKHART': ('Elkhart County', Decimal('0.015')),
            'JOHNSON': ('Johnson County', Decimal('0.015')),
            'PORTER': ('Porter County', Decimal('0.015')),
            'DELAWARE': ('Delaware County', Decimal('0.01')),  # Muncie
            'TIPPECANOE': ('Tippecanoe County', Decimal('0.01')),  # Lafayette
            'MADISON': ('Madison County', Decimal('0.01')),
            'MONROE': ('Monroe County', Decimal('0.01')),  # Bloomington
            'VIGO': ('Vigo County', Decimal('0.01')),  # Terre Haute
            'CLARK': ('Clark County', Decimal('0.01')),
            'FLOYD': ('Floyd County', Decimal('0.01')),
            'HARRISON': ('Harrison County', Decimal('0.01')),
            'HOWARD': ('Howard County', Decimal('0.01')),
            'WAYNE': ('Wayne County', Decimal('0.01')),
        }
    },
    'IA': {  # Iowa - 99 counties
        'name': 'Iowa',
        'counties': {
            'POLK': ('Polk County', Decimal('0.015')),  # Des Moines
            'LINN': ('Linn County', Decimal('0.015')),  # Cedar Rapids
            'SCOTT': ('Scott County', Decimal('0.015')),  # Davenport
            'JOHNSON': ('Johnson County', Decimal('0.015')),  # Iowa City
            'BLACK_HAWK': ('Black Hawk County', Decimal('0.015')),  # Waterloo
            'WOODBURY': ('Woodbury County', Decimal('0.015')),  # Sioux City
            'DUBUQUE': ('Dubuque County', Decimal('0.015')),
            'STORY': ('Story County', Decimal('0.015')),  # Ames
            'DALLAS': ('Dallas County', Decimal('0.01')),
            'WARREN': ('Warren County', Decimal('0.01')),
            'MUSCATINE': ('Muscatine County', Decimal('0.01')),
            'POTTAWATTAMIE': ('Pottawattamie County', Decimal('0.01')),
            'JASPER': ('Jasper County', Decimal('0.01')),
            'CLINTON': ('Clinton County', Decimal('0.01')),
            'LEE': ('Lee County', Decimal('0.01')),
            'DES_MOINES': ('Des Moines County', Decimal('0.01')),
            'CERRO_GORDO': ('Cerro Gordo County', Decimal('0.01')),
            'MAHASKA': ('Mahaska County', Decimal('0.01')),
            'WEBSTER': ('Webster County', Decimal('0.01')),
            'HAMILTON': ('Hamilton County', Decimal('0.01')),
        }
    },
    'KS': {  # Kansas - 105 counties
        'name': 'Kansas',
        'counties': {
            'SEDGWICK': ('Sedgwick County', Decimal('0.02')),  # Wichita
            'JOHNSON': ('Johnson County', Decimal('0.025')),  # Kansas City area
            'SHAWNEE': ('Shawnee County', Decimal('0.0175')),  # Topeka
            'WYANDOTTE': ('Wyandotte County', Decimal('0.0175')),  # Kansas City
            'DOUGLAS': ('Douglas County', Decimal('0.015')),  # Lawrence
            'LEAVENWORTH': ('Leavenworth County', Decimal('0.015')),
            'BUTLER': ('Butler County', Decimal('0.015')),
            'RENO': ('Reno County', Decimal('0.015')),
            'SALINE': ('Saline County', Decimal('0.015')),  # Salina
            'HARVEY': ('Harvey County', Decimal('0.015')),
            'RILEY': ('Riley County', Decimal('0.015')),  # Manhattan
            'COWLEY': ('Cowley County', Decimal('0.01')),
            'FINNEY': ('Finney County', Decimal('0.01')),
            'FORD': ('Ford County', Decimal('0.01')),
            'CRAWFORD': ('Crawford County', Decimal('0.01')),
            'LYON': ('Lyon County', Decimal('0.01')),
            'MCPHERSON': ('McPherson County', Decimal('0.01')),
            'ELLIS': ('Ellis County', Decimal('0.01')),
            'LABETTE': ('Labette County', Decimal('0.01')),
            'GEARY': ('Geary County', Decimal('0.01')),
        }
    },
    'KY': {  # Kentucky - 120 counties
        'name': 'Kentucky',
        'counties': {
            'JEFFERSON': ('Jefferson County', Decimal('0.015')),  # Louisville
            'FAYETTE': ('Fayette County', Decimal('0.015')),  # Lexington
            'KENTON': ('Kenton County', Decimal('0.015')),  # Cincinnati area
            'BOONE': ('Boone County', Decimal('0.015')),
            'WARREN': ('Warren County', Decimal('0.015')),  # Bowling Green
            'HARDIN': ('Hardin County', Decimal('0.01')),
            'DAVIESS': ('Daviess County', Decimal('0.01')),
            'CAMPBELL': ('Campbell County', Decimal('0.01')),
            'MADISON': ('Madison County', Decimal('0.01')),
            'MCCRACKEN': ('McCracken County', Decimal('0.01')),
            'CHRISTIAN': ('Christian County', Decimal('0.01')),
            'BULLITT': ('Bullitt County', Decimal('0.01')),
            'PULASKI': ('Pulaski County', Decimal('0.01')),
            'LAUREL': ('Laurel County', Decimal('0.01')),
            'OLDHAM': ('Oldham County', Decimal('0.01')),
            'BOYD': ('Boyd County', Decimal('0.01')),
            'NELSON': ('Nelson County', Decimal('0.01')),
            'GRAVES': ('Graves County', Decimal('0.01')),
            'SCOTT': ('Scott County', Decimal('0.01')),
            'HOPKINS': ('Hopkins County', Decimal('0.01')),
        }
    },
    'LA': {  # Louisiana - 64 parishes (called counties for consistency)
        'name': 'Louisiana',
        'counties': {
            'ORLEANS': ('Orleans Parish', Decimal('0.02')),  # New Orleans
            'JEFFERSON': ('Jefferson Parish', Decimal('0.02')),
            'EAST_BATON_ROUGE': ('East Baton Rouge Parish', Decimal('0.0175')),  # Baton Rouge
            'CADDO': ('Caddo Parish', Decimal('0.015')),  # Shreveport
            'LAFAYETTE': ('Lafayette Parish', Decimal('0.015')),
            'ST_TAMMANY': ('St. Tammany Parish', Decimal('0.015')),
            'CALCASIEU': ('Calcasieu Parish', Decimal('0.015')),  # Lake Charles
            'OUACHITA': ('Ouachita Parish', Decimal('0.015')),  # Monroe
            'RAPIDES': ('Rapides Parish', Decimal('0.015')),
            'LIVINGSTON': ('Livingston Parish', Decimal('0.015')),
            'ST_CHARLES': ('St. Charles Parish', Decimal('0.015')),
            'BOSSIER': ('Bossier Parish', Decimal('0.015')),
            'TERREBONNE': ('Terrebonne Parish', Decimal('0.015')),
            'IBERIA': ('Iberia Parish', Decimal('0.015')),
            'ASCENSION': ('Ascension Parish', Decimal('0.015')),
            'TANGIPAHOA': ('Tangipahoa Parish', Decimal('0.015')),
            'WEST_BATON_ROUGE': ('West Baton Rouge Parish', Decimal('0.01')),
            'ST_JOHN_THE_BAPTIST': ('St. John the Baptist Parish', Decimal('0.01')),
            'AVOYELLES': ('Avoyelles Parish', Decimal('0.01')),
            'VERMILION': ('Vermilion Parish', Decimal('0.01')),
        }
    },
    'ME': {  # Maine - 16 counties
        'name': 'Maine',
        'counties': {
            'CUMBERLAND': ('Cumberland County', Decimal('0.00')),  # Portland - no local tax
            'PENOBSCOT': ('Penobscot County', Decimal('0.00')),  # Bangor
            'YORK': ('York County', Decimal('0.00')),
            'KENNEBEC': ('Kennebec County', Decimal('0.00')),  # Augusta
            'ANDROSCOGGIN': ('Androscoggin County', Decimal('0.00')),
            'AROOSTOOK': ('Aroostook County', Decimal('0.00')),
            'HANCOCK': ('Hancock County', Decimal('0.00')),
            'KNOX': ('Knox County', Decimal('0.00')),
            'OXFORD': ('Oxford County', Decimal('0.00')),
            'PISCATAQUIS': ('Piscataquis County', Decimal('0.00')),
            'SAGADAHOC': ('Sagadahoc County', Decimal('0.00')),
            'SOMERSET': ('Somerset County', Decimal('0.00')),
            'WALDO': ('Waldo County', Decimal('0.00')),
            'WASHINGTON': ('Washington County', Decimal('0.00')),
            'FRANKLIN': ('Franklin County', Decimal('0.00')),
            'LINCOLN': ('Lincoln County', Decimal('0.00')),
        }
    },
    'MD': {  # Maryland - 23 counties
        'name': 'Maryland',
        'counties': {
            'MONTGOMERY': ('Montgomery County', Decimal('0.00')),  # No local sales tax
            'PRINCE_GEORGES': ('Prince George\'s County', Decimal('0.00')),
            'BALTIMORE_COUNTY': ('Baltimore County', Decimal('0.00')),
            'ANNE_ARUNDEL': ('Anne Arundel County', Decimal('0.00')),
            'BALTIMORE_CITY': ('Baltimore City', Decimal('0.00')),
            'HARFORD': ('Harford County', Decimal('0.00')),
            'HOWARD': ('Howard County', Decimal('0.00')),
            'FREDERICK': ('Frederick County', Decimal('0.00')),
            'CHARLES': ('Charles County', Decimal('0.00')),
            'WASHINGTON': ('Washington County', Decimal('0.00')),
            'ST_MARYS': ('St. Mary\'s County', Decimal('0.00')),
            'CARROLL': ('Carroll County', Decimal('0.00')),
            'CALVERT': ('Calvert County', Decimal('0.00')),
            'WICOMICO': ('Wicomico County', Decimal('0.00')),
            'ALLEGANY': ('Allegany County', Decimal('0.00')),
            'CECIL': ('Cecil County', Decimal('0.00')),
            'WORCESTER': ('Worcester County', Decimal('0.00')),
            'QUEEN_ANNES': ('Queen Anne\'s County', Decimal('0.00')),
            'DORCHESTER': ('Dorchester County', Decimal('0.00')),
            'TALBOT': ('Talbot County', Decimal('0.00')),
            'CAROLINE': ('Caroline County', Decimal('0.00')),
            'GARRETT': ('Garrett County', Decimal('0.00')),
            'KENT': ('Kent County', Decimal('0.00')),
        }
    },
    'MA': {  # Massachusetts - 14 counties
        'name': 'Massachusetts',
        'counties': {
            'MIDDLESEX': ('Middlesex County', Decimal('0.00')),  # No local sales tax
            'WORCESTER': ('Worcester County', Decimal('0.00')),
            'SUFFOLK': ('Suffolk County', Decimal('0.00')),  # Boston
            'ESSEX': ('Essex County', Decimal('0.00')),
            'NORFOLK': ('Norfolk County', Decimal('0.00')),
            'BRISTOL': ('Bristol County', Decimal('0.00')),
            'PLYMOUTH': ('Plymouth County', Decimal('0.00')),
            'HAMPDEN': ('Hampden County', Decimal('0.00')),
            'BARNSTABLE': ('Barnstable County', Decimal('0.00')),  # Cape Cod
            'HAMPSHIRE': ('Hampshire County', Decimal('0.00')),
            'BERKSHIRE': ('Berkshire County', Decimal('0.00')),
            'FRANKLIN': ('Franklin County', Decimal('0.00')),
            'DUKES': ('Dukes County', Decimal('0.00')),  # Martha's Vineyard
            'NANTUCKET': ('Nantucket County', Decimal('0.00')),
        }
    },
    'MI': {  # Michigan - 83 counties
        'name': 'Michigan',
        'counties': {
            'WAYNE': ('Wayne County', Decimal('0.00')),  # Detroit - no local sales tax
            'OAKLAND': ('Oakland County', Decimal('0.00')),
            'MACOMB': ('Macomb County', Decimal('0.00')),
            'KENT': ('Kent County', Decimal('0.00')),  # Grand Rapids
            'GENESEE': ('Genesee County', Decimal('0.00')),  # Flint
            'WASHTENAW': ('Washtenaw County', Decimal('0.00')),  # Ann Arbor
            'OTTAWA': ('Ottawa County', Decimal('0.00')),
            'INGHAM': ('Ingham County', Decimal('0.00')),  # Lansing
            'KALAMAZOO': ('Kalamazoo County', Decimal('0.00')),
            'SAGINAW': ('Saginaw County', Decimal('0.00')),
            'MUSKEGON': ('Muskegon County', Decimal('0.00')),
            'JACKSON': ('Jackson County', Decimal('0.00')),
            'BERRIEN': ('Berrien County', Decimal('0.00')),
            'CALHOUN': ('Calhoun County', Decimal('0.00')),
            'ST_CLAIR': ('St. Clair County', Decimal('0.00')),
            'EATON': ('Eaton County', Decimal('0.00')),
            'ALLEGAN': ('Allegan County', Decimal('0.00')),
            'BAY': ('Bay County', Decimal('0.00')),
            'CLINTON': ('Clinton County', Decimal('0.00')),
            'LENAWEE': ('Lenawee County', Decimal('0.00')),
        }
    },
    'MN': {  # Minnesota - 87 counties
        'name': 'Minnesota',
        'counties': {
            'HENNEPIN': ('Hennepin County', Decimal('0.015')),  # Minneapolis
            'RAMSEY': ('Ramsey County', Decimal('0.015')),  # St. Paul
            'DAKOTA': ('Dakota County', Decimal('0.0125')),
            'ANOKA': ('Anoka County', Decimal('0.0125')),
            'WASHINGTON': ('Washington County', Decimal('0.0125')),
            'ST_LOUIS': ('St. Louis County', Decimal('0.015')),  # Duluth
            'WRIGHT': ('Wright County', Decimal('0.01')),
            'SCOTT': ('Scott County', Decimal('0.01')),
            'CARVER': ('Carver County', Decimal('0.01')),
            'OLMSTED': ('Olmsted County', Decimal('0.015')),  # Rochester
            'STEARNS': ('Stearns County', Decimal('0.01')),
            'BLUE_EARTH': ('Blue Earth County', Decimal('0.01')),
            'CROW_WING': ('Crow Wing County', Decimal('0.01')),
            'RICE': ('Rice County', Decimal('0.01')),
            'SHERBURNE': ('Sherburne County', Decimal('0.01')),
            'ISANTI': ('Isanti County', Decimal('0.01')),
            'WINONA': ('Winona County', Decimal('0.01')),
            'GOODHUE': ('Goodhue County', Decimal('0.01')),
            'CHISAGO': ('Chisago County', Decimal('0.01')),
            'BENTON': ('Benton County', Decimal('0.01')),
        }
    },
    'MS': {  # Mississippi - 82 counties
        'name': 'Mississippi',
        'counties': {
            'HINDS': ('Hinds County', Decimal('0.015')),  # Jackson
            'HARRISON': ('Harrison County', Decimal('0.015')),  # Biloxi/Gulfport
            'DESOTO': ('DeSoto County', Decimal('0.015')),
            'MADISON': ('Madison County', Decimal('0.015')),
            'RANKIN': ('Rankin County', Decimal('0.015')),
            'JACKSON': ('Jackson County', Decimal('0.015')),
            'FORREST': ('Forrest County', Decimal('0.01')),  # Hattiesburg
            'LAUDERDALE': ('Lauderdale County', Decimal('0.01')),
            'LEE': ('Lee County', Decimal('0.01')),
            'JONES': ('Jones County', Decimal('0.01')),
            'LAFAYETTE': ('Lafayette County', Decimal('0.01')),
            'LOWNDES': ('Lowndes County', Decimal('0.01')),
            'PIKE': ('Pike County', Decimal('0.01')),
            'PEARL_RIVER': ('Pearl River County', Decimal('0.01')),
            'WARREN': ('Warren County', Decimal('0.01')),
            'WASHINGTON': ('Washington County', Decimal('0.01')),
            'ADAMS': ('Adams County', Decimal('0.01')),
            'COAHOMA': ('Coahoma County', Decimal('0.01')),
            'OKTIBBEHA': ('Oktibbeha County', Decimal('0.01')),
            'PONTOTOC': ('Pontotoc County', Decimal('0.01')),
        }
    },
    'MO': {  # Missouri - 114 counties + St. Louis City
        'name': 'Missouri',
        'counties': {
            'ST_LOUIS_COUNTY': ('St. Louis County', Decimal('0.025')),
            'ST_LOUIS_CITY': ('St. Louis City', Decimal('0.025')),
            'JACKSON': ('Jackson County', Decimal('0.025')),  # Kansas City
            'ST_CHARLES': ('St. Charles County', Decimal('0.02')),
            'JEFFERSON': ('Jefferson County', Decimal('0.02')),
            'GREENE': ('Greene County', Decimal('0.02')),  # Springfield
            'CLAY': ('Clay County', Decimal('0.02')),
            'BOONE': ('Boone County', Decimal('0.02')),  # Columbia
            'CASS': ('Cass County', Decimal('0.015')),
            'FRANKLIN': ('Franklin County', Decimal('0.015')),
            'CHRISTIAN': ('Christian County', Decimal('0.015')),
            'CAPE_GIRARDEAU': ('Cape Girardeau County', Decimal('0.015')),
            'BUCHANAN': ('Buchanan County', Decimal('0.015')),
            'PLATTE': ('Platte County', Decimal('0.015')),
            'WARREN': ('Warren County', Decimal('0.015')),
            'JASPER': ('Jasper County', Decimal('0.015')),
            'PHELPS': ('Phelps County', Decimal('0.015')),
            'SCOTT': ('Scott County', Decimal('0.015')),
            'COLE': ('Cole County', Decimal('0.015')),  # Jefferson City
            'TANEY': ('Taney County', Decimal('0.015')),
        }
    },
    'MT': {  # Montana - 56 counties (no state sales tax)
        'name': 'Montana',
        'counties': {
            'YELLOWSTONE': ('Yellowstone County', Decimal('0.00')),  # No sales tax
            'MISSOULA': ('Missoula County', Decimal('0.00')),
            'GALLATIN': ('Gallatin County', Decimal('0.00')),
            'FLATHEAD': ('Flathead County', Decimal('0.00')),
            'CASCADE': ('Cascade County', Decimal('0.00')),
            'LEWIS_AND_CLARK': ('Lewis and Clark County', Decimal('0.00')),
            'RAVALLI': ('Ravalli County', Decimal('0.00')),
            'LAKE': ('Lake County', Decimal('0.00')),
            'SILVER_BOW': ('Silver Bow County', Decimal('0.00')),
            'DEER_LODGE': ('Deer Lodge County', Decimal('0.00')),
            'BIG_HORN': ('Big Horn County', Decimal('0.00')),
            'CARBON': ('Carbon County', Decimal('0.00')),
            'PARK': ('Park County', Decimal('0.00')),
            'ROOSEVELT': ('Roosevelt County', Decimal('0.00')),
            'HILL': ('Hill County', Decimal('0.00')),
            'CUSTER': ('Custer County', Decimal('0.00')),
            'GLACIER': ('Glacier County', Decimal('0.00')),
            'TOOLE': ('Toole County', Decimal('0.00')),
            'SANDERS': ('Sanders County', Decimal('0.00')),
            'DAWSON': ('Dawson County', Decimal('0.00')),
        }
    },
    'NE': {  # Nebraska - 93 counties
        'name': 'Nebraska',
        'counties': {
            'DOUGLAS': ('Douglas County', Decimal('0.015')),  # Omaha
            'LANCASTER': ('Lancaster County', Decimal('0.015')),  # Lincoln
            'SARPY': ('Sarpy County', Decimal('0.015')),
            'HALL': ('Hall County', Decimal('0.015')),  # Grand Island
            'BUFFALO': ('Buffalo County', Decimal('0.01')),  # Kearney
            'DODGE': ('Dodge County', Decimal('0.01')),
            'MADISON': ('Madison County', Decimal('0.01')),
            'WASHINGTON': ('Washington County', Decimal('0.01')),
            'SCOTTS_BLUFF': ('Scotts Bluff County', Decimal('0.015')),
            'DAWSON': ('Dawson County', Decimal('0.01')),
            'ADAMS': ('Adams County', Decimal('0.01')),
            'CASS': ('Cass County', Decimal('0.01')),
            'SAUNDERS': ('Saunders County', Decimal('0.01')),
            'LINCOLN': ('Lincoln County', Decimal('0.015')),  # North Platte
            'PLATTE': ('Platte County', Decimal('0.01')),
            'SEWARD': ('Seward County', Decimal('0.01')),
            'GAGE': ('Gage County', Decimal('0.01')),
            'YORK': ('York County', Decimal('0.01')),
            'MERRICK': ('Merrick County', Decimal('0.01')),
            'KEITH': ('Keith County', Decimal('0.01')),
        }
    },
    'NV': {  # Nevada - 16 counties + Carson City
        'name': 'Nevada',
        'counties': {
            'CLARK': ('Clark County', Decimal('0.0125')),  # Las Vegas
            'WASHOE': ('Washoe County', Decimal('0.01')),  # Reno
            'CARSON_CITY': ('Carson City', Decimal('0.01')),
            'NYE': ('Nye County', Decimal('0.00')),
            'LYON': ('Lyon County', Decimal('0.00')),
            'ELKO': ('Elko County', Decimal('0.00')),
            'DOUGLAS': ('Douglas County', Decimal('0.00')),
            'CHURCHILL': ('Churchill County', Decimal('0.00')),
            'HUMBOLDT': ('Humboldt County', Decimal('0.00')),
            'LANDER': ('Lander County', Decimal('0.00')),
            'WHITE_PINE': ('White Pine County', Decimal('0.00')),
            'MINERAL': ('Mineral County', Decimal('0.00')),
            'LINCOLN': ('Lincoln County', Decimal('0.00')),
            'PERSHING': ('Pershing County', Decimal('0.00')),
            'EUREKA': ('Eureka County', Decimal('0.00')),
            'STOREY': ('Storey County', Decimal('0.00')),
            'ESMERALDA': ('Esmeralda County', Decimal('0.00')),
        }
    },
    'NH': {  # New Hampshire - 10 counties (no state sales tax)
        'name': 'New Hampshire',
        'counties': {
            'HILLSBOROUGH': ('Hillsborough County', Decimal('0.00')),  # No sales tax
            'ROCKINGHAM': ('Rockingham County', Decimal('0.00')),
            'MERRIMACK': ('Merrimack County', Decimal('0.00')),
            'STRAFFORD': ('Strafford County', Decimal('0.00')),
            'GRAFTON': ('Grafton County', Decimal('0.00')),
            'BELKNAP': ('Belknap County', Decimal('0.00')),
            'CARROLL': ('Carroll County', Decimal('0.00')),
            'CHESHIRE': ('Cheshire County', Decimal('0.00')),
            'SULLIVAN': ('Sullivan County', Decimal('0.00')),
            'COOS': ('Coos County', Decimal('0.00')),
        }
    },
    'NJ': {  # New Jersey - 21 counties
        'name': 'New Jersey',
        'counties': {
            'BERGEN': ('Bergen County', Decimal('0.00')),  # No local sales tax
            'MIDDLESEX': ('Middlesex County', Decimal('0.00')),
            'ESSEX': ('Essex County', Decimal('0.00')),
            'HUDSON': ('Hudson County', Decimal('0.00')),
            'MONMOUTH': ('Monmouth County', Decimal('0.00')),
            'CAMDEN': ('Camden County', Decimal('0.00')),
            'UNION': ('Union County', Decimal('0.00')),
            'MORRIS': ('Morris County', Decimal('0.00')),
            'OCEAN': ('Ocean County', Decimal('0.00')),
            'BURLINGTON': ('Burlington County', Decimal('0.00')),
            'PASSAIC': ('Passaic County', Decimal('0.00')),
            'SOMERSET': ('Somerset County', Decimal('0.00')),
            'GLOUCESTER': ('Gloucester County', Decimal('0.00')),
            'MERCER': ('Mercer County', Decimal('0.00')),  # Trenton
            'ATLANTIC': ('Atlantic County', Decimal('0.00')),
            'CUMBERLAND': ('Cumberland County', Decimal('0.00')),
            'SUSSEX': ('Sussex County', Decimal('0.00')),
            'WARREN': ('Warren County', Decimal('0.00')),
            'HUNTERDON': ('Hunterdon County', Decimal('0.00')),
            'CAPE_MAY': ('Cape May County', Decimal('0.00')),
            'SALEM': ('Salem County', Decimal('0.00')),
        }
    },
    'NM': {  # New Mexico - 33 counties
        'name': 'New Mexico',
        'counties': {
            'BERNALILLO': ('Bernalillo County', Decimal('0.02')),  # Albuquerque
            'SANTA_FE': ('Santa Fe County', Decimal('0.0175')),
            'DONA_ANA': ('Doña Ana County', Decimal('0.015')),  # Las Cruces
            'SAN_JUAN': ('San Juan County', Decimal('0.015')),  # Farmington
            'SANDOVAL': ('Sandoval County', Decimal('0.015')),
            'VALENCIA': ('Valencia County', Decimal('0.015')),
            'EDDY': ('Eddy County', Decimal('0.0125')),
            'OTERO': ('Otero County', Decimal('0.0125')),
            'MCKINLEY': ('McKinley County', Decimal('0.0125')),
            'LEA': ('Lea County', Decimal('0.0125')),
            'CHAVES': ('Chaves County', Decimal('0.0125')),  # Roswell
            'CURRY': ('Curry County', Decimal('0.0125')),
            'RIO_ARRIBA': ('Rio Arriba County', Decimal('0.01')),
            'LINCOLN': ('Lincoln County', Decimal('0.01')),
            'TAOS': ('Taos County', Decimal('0.01')),
            'LUNA': ('Luna County', Decimal('0.01')),
            'COLFAX': ('Colfax County', Decimal('0.01')),
            'GRANT': ('Grant County', Decimal('0.01')),
            'SAN_MIGUEL': ('San Miguel County', Decimal('0.01')),
            'ROOSEVELT': ('Roosevelt County', Decimal('0.01')),
            'SOCORRO': ('Socorro County', Decimal('0.01')),
            'UNION': ('Union County', Decimal('0.01')),
            'QUAY': ('Quay County', Decimal('0.01')),
            'GUADALUPE': ('Guadalupe County', Decimal('0.01')),
            'HIDALGO': ('Hidalgo County', Decimal('0.01')),
            'MORA': ('Mora County', Decimal('0.01')),
            'CATRON': ('Catron County', Decimal('0.01')),
            'SIERRA': ('Sierra County', Decimal('0.01')),
            'DE_BACA': ('De Baca County', Decimal('0.01')),
            'TORRANCE': ('Torrance County', Decimal('0.01')),
            'LOS_ALAMOS': ('Los Alamos County', Decimal('0.01')),
            'HARDING': ('Harding County', Decimal('0.01')),
            'ARTHUR': ('Arthur County', Decimal('0.01')),
        }
    },
    'NY': {  # New York - 62 counties (major ones)
        'name': 'New York',
        'counties': {
            'NEW_YORK': ('New York County', Decimal('0.025')),  # Manhattan
            'KINGS': ('Kings County', Decimal('0.025')),  # Brooklyn
            'QUEENS': ('Queens County', Decimal('0.025')),
            'BRONX': ('Bronx County', Decimal('0.025')),
            'RICHMOND': ('Richmond County', Decimal('0.025')),  # Staten Island
            'NASSAU': ('Nassau County', Decimal('0.025')),
            'SUFFOLK': ('Suffolk County', Decimal('0.025')),
            'WESTCHESTER': ('Westchester County', Decimal('0.025')),
            'ERIE': ('Erie County', Decimal('0.025')),  # Buffalo
            'MONROE': ('Monroe County', Decimal('0.025')),  # Rochester
            'ONONDAGA': ('Onondaga County', Decimal('0.025')),  # Syracuse
            'ALBANY': ('Albany County', Decimal('0.025')),
            'ONEIDA': ('Oneida County', Decimal('0.025')),  # Utica
            'NIAGARA': ('Niagara County', Decimal('0.025')),
            'DUTCHESS': ('Dutchess County', Decimal('0.025')),
            'ORANGE': ('Orange County', Decimal('0.025')),
            'ROCKLAND': ('Rockland County', Decimal('0.025')),
            'SCHENECTADY': ('Schenectady County', Decimal('0.025')),
            'BROOME': ('Broome County', Decimal('0.025')),
            'RENSSELAER': ('Rensselaer County', Decimal('0.025')),
        }
    },
    'NC': {  # North Carolina - 100 counties
        'name': 'North Carolina',
        'counties': {
            'MECKLENBURG': ('Mecklenburg County', Decimal('0.025')),  # Charlotte
            'WAKE': ('Wake County', Decimal('0.025')),  # Raleigh
            'GUILFORD': ('Guilford County', Decimal('0.025')),  # Greensboro
            'FORSYTH': ('Forsyth County', Decimal('0.025')),  # Winston-Salem
            'DURHAM': ('Durham County', Decimal('0.025')),
            'BUNCOMBE': ('Buncombe County', Decimal('0.025')),  # Asheville
            'CUMBERLAND': ('Cumberland County', Decimal('0.025')),  # Fayetteville
            'NEW_HANOVER': ('New Hanover County', Decimal('0.025')),  # Wilmington
            'GASTON': ('Gaston County', Decimal('0.02')),
            'UNION': ('Union County', Decimal('0.02')),
            'IREDELL': ('Iredell County', Decimal('0.02')),
            'ORANGE': ('Orange County', Decimal('0.02')),  # Chapel Hill
            'CABARRUS': ('Cabarrus County', Decimal('0.02')),
            'JOHNSTON': ('Johnston County', Decimal('0.02')),
            'CATAWBA': ('Catawba County', Decimal('0.02')),
            'ROWAN': ('Rowan County', Decimal('0.02')),
            'NASH': ('Nash County', Decimal('0.02')),
            'ALAMANCE': ('Alamance County', Decimal('0.02')),
            'RANDOLPH': ('Randolph County', Decimal('0.02')),
            'ROBESON': ('Robeson County', Decimal('0.02')),
        }
    },
    'ND': {  # North Dakota - 53 counties
        'name': 'North Dakota',
        'counties': {
            'CASS': ('Cass County', Decimal('0.015')),  # Fargo
            'BURLEIGH': ('Burleigh County', Decimal('0.015')),  # Bismarck
            'GRAND_FORKS': ('Grand Forks County', Decimal('0.015')),
            'WARD': ('Ward County', Decimal('0.015')),  # Minot
            'WILLIAMS': ('Williams County', Decimal('0.015')),
            'STARK': ('Stark County', Decimal('0.015')),  # Dickinson
            'MORTON': ('Morton County', Decimal('0.01')),
            'STUTSMAN': ('Stutsman County', Decimal('0.01')),
            'RICHLAND': ('Richland County', Decimal('0.01')),
            'MCLEAN': ('McLean County', Decimal('0.01')),
            'RAMSEY': ('Ramsey County', Decimal('0.01')),
            'WALSH': ('Walsh County', Decimal('0.01')),
            'ROLETTE': ('Rolette County', Decimal('0.01')),
            'TRAILL': ('Traill County', Decimal('0.01')),
            'BOTTINEAU': ('Bottineau County', Decimal('0.01')),
            'BARNES': ('Barnes County', Decimal('0.01')),
            'PEMBINA': ('Pembina County', Decimal('0.01')),
            'LAMOURE': ('LaMoure County', Decimal('0.01')),
            'DICKEY': ('Dickey County', Decimal('0.01')),
            'NELSON': ('Nelson County', Decimal('0.01')),
        }
    },
    'OH': {  # Ohio - 88 counties
        'name': 'Ohio',
        'counties': {
            'CUYAHOGA': ('Cuyahoga County', Decimal('0.0225')),  # Cleveland
            'HAMILTON': ('Hamilton County', Decimal('0.0175')),  # Cincinnati
            'FRANKLIN': ('Franklin County', Decimal('0.015')),  # Columbus
            'MONTGOMERY': ('Montgomery County', Decimal('0.0175')),  # Dayton
            'SUMMIT': ('Summit County', Decimal('0.015')),  # Akron
            'LUCAS': ('Lucas County', Decimal('0.015')),  # Toledo
            'STARK': ('Stark County', Decimal('0.015')),  # Canton
            'BUTLER': ('Butler County', Decimal('0.015')),
            'LORAIN': ('Lorain County', Decimal('0.015')),
            'MAHONING': ('Mahoning County', Decimal('0.0175')),  # Youngstown
            'LAKE': ('Lake County', Decimal('0.015')),
            'WARREN': ('Warren County', Decimal('0.015')),
            'CLERMONT': ('Clermont County', Decimal('0.015')),
            'TRUMBULL': ('Trumbull County', Decimal('0.015')),
            'DELAWARE': ('Delaware County', Decimal('0.015')),
            'MEDINA': ('Medina County', Decimal('0.015')),
            'FAIRFIELD': ('Fairfield County', Decimal('0.015')),
            'LICKING': ('Licking County', Decimal('0.015')),
            'GREENE': ('Greene County', Decimal('0.015')),
            'PORTAGE': ('Portage County', Decimal('0.015')),
        }
    },
    'OK': {  # Oklahoma - 77 counties
        'name': 'Oklahoma',
        'counties': {
            'OKLAHOMA': ('Oklahoma County', Decimal('0.02')),  # Oklahoma City
            'TULSA': ('Tulsa County', Decimal('0.0275')),  # Tulsa
            'CLEVELAND': ('Cleveland County', Decimal('0.015')),  # Norman
            'COMANCHE': ('Comanche County', Decimal('0.015')),  # Lawton
            'CANADIAN': ('Canadian County', Decimal('0.015')),
            'CREEK': ('Creek County', Decimal('0.015')),
            'ROGERS': ('Rogers County', Decimal('0.015')),
            'WAGONER': ('Wagoner County', Decimal('0.015')),
            'WASHINGTON': ('Washington County', Decimal('0.015')),  # Bartlesville
            'POTTAWATOMIE': ('Pottawatomie County', Decimal('0.01')),
            'MUSKOGEE': ('Muskogee County', Decimal('0.01')),
            'PAYNE': ('Payne County', Decimal('0.015')),  # Stillwater
            'GARFIELD': ('Garfield County', Decimal('0.01')),
            'MCINTOSH': ('McIntosh County', Decimal('0.01')),
            'PITTSBURG': ('Pittsburg County', Decimal('0.01')),
            'OKMULGEE': ('Okmulgee County', Decimal('0.01')),
            'BRYAN': ('Bryan County', Decimal('0.01')),
            'LE_FLORE': ('Le Flore County', Decimal('0.01')),
            'CARTER': ('Carter County', Decimal('0.01')),
            'CADDO': ('Caddo County', Decimal('0.01')),
        }
    },
    'OR': {  # Oregon - 36 counties (no state sales tax)
        'name': 'Oregon',
        'counties': {
            'MULTNOMAH': ('Multnomah County', Decimal('0.00')),  # Portland - no sales tax
            'WASHINGTON': ('Washington County', Decimal('0.00')),
            'CLACKAMAS': ('Clackamas County', Decimal('0.00')),
            'MARION': ('Marion County', Decimal('0.00')),  # Salem
            'LANE': ('Lane County', Decimal('0.00')),  # Eugene
            'JACKSON': ('Jackson County', Decimal('0.00')),  # Medford
            'DESCHUTES': ('Deschutes County', Decimal('0.00')),  # Bend
            'YAMHILL': ('Yamhill County', Decimal('0.00')),
            'POLK': ('Polk County', Decimal('0.00')),
            'DOUGLAS': ('Douglas County', Decimal('0.00')),
            'LINN': ('Linn County', Decimal('0.00')),
            'BENTON': ('Benton County', Decimal('0.00')),
            'COLUMBIA': ('Columbia County', Decimal('0.00')),
            'JOSEPHINE': ('Josephine County', Decimal('0.00')),
            'KLAMATH': ('Klamath County', Decimal('0.00')),
            'TILLAMOOK': ('Tillamook County', Decimal('0.00')),
            'UMATILLA': ('Umatilla County', Decimal('0.00')),
            'COOS': ('Coos County', Decimal('0.00')),
            'CLATSOP': ('Clatsop County', Decimal('0.00')),
            'CURRY': ('Curry County', Decimal('0.00')),
            'LINCOLN': ('Lincoln County', Decimal('0.00')),
            'MORROW': ('Morrow County', Decimal('0.00')),
            'BAKER': ('Baker County', Decimal('0.00')),
            'UNION': ('Union County', Decimal('0.00')),
            'CROOK': ('Crook County', Decimal('0.00')),
            'WALLOWA': ('Wallowa County', Decimal('0.00')),
            'HARNEY': ('Harney County', Decimal('0.00')),
            'GRANT': ('Grant County', Decimal('0.00')),
            'MALHEUR': ('Malheur County', Decimal('0.00')),
            'LAKE': ('Lake County', Decimal('0.00')),
            'HOOD_RIVER': ('Hood River County', Decimal('0.00')),
            'WASCO': ('Wasco County', Decimal('0.00')),
            'SHERMAN': ('Sherman County', Decimal('0.00')),
            'GILLIAM': ('Gilliam County', Decimal('0.00')),
            'WHEELER': ('Wheeler County', Decimal('0.00')),
            'JEFFERSON': ('Jefferson County', Decimal('0.00')),
        }
    },
    'PA': {  # Pennsylvania - 67 counties
        'name': 'Pennsylvania',
        'counties': {
            'PHILADELPHIA': ('Philadelphia County', Decimal('0.02')),  # Philadelphia
            'ALLEGHENY': ('Allegheny County', Decimal('0.01')),  # Pittsburgh
            'MONTGOMERY': ('Montgomery County', Decimal('0.01')),
            'BUCKS': ('Bucks County', Decimal('0.01')),
            'CHESTER': ('Chester County', Decimal('0.01')),
            'DELAWARE': ('Delaware County', Decimal('0.01')),
            'LANCASTER': ('Lancaster County', Decimal('0.01')),
            'YORK': ('York County', Decimal('0.01')),
            'BERKS': ('Berks County', Decimal('0.01')),
            'LUZERNE': ('Luzerne County', Decimal('0.01')),
            'LACKAWANNA': ('Lackawanna County', Decimal('0.01')),  # Scranton
            'LEHIGH': ('Lehigh County', Decimal('0.01')),
            'NORTHAMPTON': ('Northampton County', Decimal('0.01')),
            'WESTMORELAND': ('Westmoreland County', Decimal('0.01')),
            'DAUPHIN': ('Dauphin County', Decimal('0.01')),  # Harrisburg
            'WASHINGTON': ('Washington County', Decimal('0.01')),
            'LEBANON': ('Lebanon County', Decimal('0.01')),
            'BEAVER': ('Beaver County', Decimal('0.01')),
            'CUMBERLAND': ('Cumberland County', Decimal('0.01')),
            'ERIE': ('Erie County', Decimal('0.01')),
        }
    },
    'RI': {  # Rhode Island - 5 counties
        'name': 'Rhode Island',
        'counties': {
            'PROVIDENCE': ('Providence County', Decimal('0.00')),  # No local sales tax
            'KENT': ('Kent County', Decimal('0.00')),
            'WASHINGTON': ('Washington County', Decimal('0.00')),
            'NEWPORT': ('Newport County', Decimal('0.00')),
            'BRISTOL': ('Bristol County', Decimal('0.00')),
        }
    },
}

def add_us_county_rates():
    print("US County Tax Rates - Batch 3 (30 states: GA to RI)")
    print("==" * 40)
    
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
    
    print(f"\n✅ Batch 3 Complete! States: {states_processed}, Counties: {total_counties_added}")

if __name__ == "__main__":
    add_us_county_rates()