# Connection Pooling Implementation Guide

## Option 1: PgBouncer (Recommended for Production)

PgBouncer is a lightweight connection pooler for PostgreSQL that dramatically reduces the number of connections to your database.

### Installation:

```bash
# On Ubuntu/Debian
sudo apt-get install pgbouncer

# On macOS
brew install pgbouncer
```

### Basic Configuration:

Create a pgbouncer.ini file:

```ini
[databases]
dott_main = host=dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com port=5432 dbname=dott_main

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /path/to/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

Create a userlist.txt file:

```
"dott_admin" "RRfXU6uPPUbBEg1JqGTJ"
```

Update your Django settings to use PgBouncer:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'dott_main',
        'USER': 'dott_admin',
        'PASSWORD': 'RRfXU6uPPUbBEg1JqGTJ',
        'HOST': '127.0.0.1',  # Connect to PgBouncer
        'PORT': '6432',       # PgBouncer port
        # Other settings remain the same
    }
}
```

## Option 2: Django Database Connection Pooling

For a simpler solution that doesn't require additional infrastructure, you can use django-db-connection-pool.

### Installation:

```bash
pip install django-db-connection-pool
```

### Configuration:

Update your Django settings:

```python
DATABASES = {
    'default': {
        'ENGINE': 'dj_db_conn_pool.backends.postgresql',
        'NAME': 'dott_main',
        'USER': 'dott_admin',
        'PASSWORD': 'RRfXU6uPPUbBEg1JqGTJ',
        'HOST': 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com',
        'PORT': '5432',
        'POOL_OPTIONS': {
            'POOL_SIZE': 20,
            'MAX_OVERFLOW': 10,
            'RECYCLE': 300,  # Connection lifetime in seconds
        }
    }
}
```

## Option 3: Increase PostgreSQL max_connections

If you're using Amazon RDS, you can modify the parameter group:

1. Go to the RDS console
2. Navigate to Parameter Groups
3. Create a new parameter group or modify the existing one
4. Set `max_connections` to a higher value (e.g., 200-500)
5. Apply the parameter group to your RDS instance
6. Restart the instance if required

Note: Increasing max_connections will increase memory usage. Make sure your instance has enough memory.