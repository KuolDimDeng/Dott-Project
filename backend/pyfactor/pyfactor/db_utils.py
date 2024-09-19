# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/db_utils.py

import psycopg2
import psycopg2.pool
from django.conf import settings

# Initialize the connection pool to None
DATABASE_POOLS = None

def initialize_database_pool():
    global DATABASE_POOLS
    if DATABASE_POOLS is None:
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

def get_connection():
    if DATABASE_POOLS is None:
        initialize_database_pool()
    
    # Get a connection from the pool
    conn = DATABASE_POOLS['default'].getconn()
    
    if conn is None:
        raise Exception("No connection available in the pool.")
    
    return conn

def return_connection(conn):
    if DATABASE_POOLS is not None and conn is not None:
        DATABASE_POOLS['default'].putconn(conn)

