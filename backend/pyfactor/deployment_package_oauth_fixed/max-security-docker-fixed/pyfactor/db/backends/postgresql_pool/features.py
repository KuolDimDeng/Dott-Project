# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/db/backends/postgresql_pool/features.py
from django.db.backends.postgresql.features import DatabaseFeatures as PostgresqlDatabaseFeatures

class DatabaseFeatures(PostgresqlDatabaseFeatures):
    uses_pooled_connections = True