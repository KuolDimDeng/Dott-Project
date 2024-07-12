# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/db_utils.py

import psycopg2.pool
from django.conf import settings

# Create a connection pool
DATABASE_POOLS = {
    'default': psycopg2.pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=10,
        host=settings.DATABASES['default']['HOST'],
        port=settings.DATABASES['default']['PORT'],
        database=settings.DATABASES['default']['NAME'],
        user=settings.DATABASES['default']['USER'],
        password=settings.DATABASES['default']['PASSWORD'],
    )
}

def get_database_pool():
    return DATABASE_POOLS['default']