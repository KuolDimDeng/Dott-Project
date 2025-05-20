#!/bin/bash
# Fix bank_account_id type mismatch
export DJANGO_SETTINGS_MODULE=pyfactor.settings
python -c "
import psycopg2
from django.conf import settings

db = settings.DATABASES['default']
conn_str = f\"dbname={db['NAME']} user={db['USER']} password={db['PASSWORD']} host={db['HOST']} port={db['PORT']}\"
conn = psycopg2.connect(conn_str)
conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

with open('/Users/kuoldeng/projectx/backend/pyfactor/finance/migrations/sql/fix_bank_account_type.sql', 'r') as f:
    sql = f.read()
    cur.execute(sql)
    print('Applied bank_account_id fix')

conn.close()
"
                