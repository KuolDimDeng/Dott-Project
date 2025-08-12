#!/usr/bin/env python3
import json
from pathlib import Path

# Define the translations for job management in hero benefits
hero_job_translations = {
    'en': {'hero': {'benefit': {'jobManagement': 'Job management & costing'}}},
    'es': {'hero': {'benefit': {'jobManagement': 'Gestión y costeo de trabajos'}}},
    'fr': {'hero': {'benefit': {'jobManagement': 'Gestion et coût des chantiers'}}},
    'pt': {'hero': {'benefit': {'jobManagement': 'Gestão e custeio de trabalhos'}}},
    'de': {'hero': {'benefit': {'jobManagement': 'Auftragsmanagement & Kalkulation'}}},
    'zh': {'hero': {'benefit': {'jobManagement': '作业管理与成本核算'}}},
    'ar': {'hero': {'benefit': {'jobManagement': 'إدارة المهام وحساب التكاليف'}}},
    'sw': {'hero': {'benefit': {'jobManagement': 'Usimamizi wa kazi na gharama'}}},
    'hi': {'hero': {'benefit': {'jobManagement': 'कार्य प्रबंधन और लागत निर्धारण'}}},
    'ru': {'hero': {'benefit': {'jobManagement': 'Управление работами и расчет стоимости'}}},
    'ja': {'hero': {'benefit': {'jobManagement': '作業管理と原価計算'}}},
    'tr': {'hero': {'benefit': {'jobManagement': 'İş yönetimi ve maliyetlendirme'}}},
    'id': {'hero': {'benefit': {'jobManagement': 'Manajemen pekerjaan & biaya'}}},
    'vi': {'hero': {'benefit': {'jobManagement': 'Quản lý công việc & chi phí'}}},
    'nl': {'hero': {'benefit': {'jobManagement': 'Opdrachtbeheer & kostenberekening'}}},
    'ha': {'hero': {'benefit': {'jobManagement': 'Gudanar da ayyuka & ƙididdige farashi'}}},
    'yo': {'hero': {'benefit': {'jobManagement': 'Iṣakoso iṣẹ & iṣiro iye owo'}}},
    'am': {'hero': {'benefit': {'jobManagement': 'የሥራ አስተዳደር እና ወጪ ስሌት'}}},
    'zu': {'hero': {'benefit': {'jobManagement': 'Ukuphathwa kwemisebenzi & izindleko'}}},
    'ko': {'hero': {'benefit': {'jobManagement': '작업 관리 및 원가 계산'}}}
}

def update_language_file(lang_code, translations):
    """Update a specific language file with hero job translation"""
    file_path = Path(f'/Users/kuoldeng/projectx/frontend/pyfactor_next/public/locales/{lang_code}/common.json')
    
    try:
        # Read existing file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Ensure hero structure exists
        if 'hero' not in data:
            data['hero'] = {}
        if 'benefit' not in data['hero']:
            data['hero']['benefit'] = {}
            
        # Update hero benefit
        data['hero']['benefit'].update(translations['hero']['benefit'])
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"✅ Updated {lang_code}/common.json")
        
    except Exception as e:
        print(f"❌ Error updating {lang_code}: {e}")

# Update all language files
for lang_code, translations in hero_job_translations.items():
    update_language_file(lang_code, translations)

print("\n✨ Hero job management translation added to all language files!")