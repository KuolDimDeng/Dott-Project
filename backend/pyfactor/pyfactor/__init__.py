import psycopg2.pool

from .settings import DATABASES

# Create a connection pool
DATABASE_POOLS = {
    'default': psycopg2.pool.ThreadedConnectionPool(
        minconn=2,  # Minimum number of connections in the pool
        maxconn=10,  # Maximum number of connections in the pool
        host=DATABASES['default']['HOST'],
        port=DATABASES['default']['PORT'],
        database=DATABASES['default']['NAME'],
        user=DATABASES['default']['USER'],
        password=DATABASES['default']['PASSWORD'],
    )
}

def get_database_pool():
    return DATABASE_POOLS['default']

