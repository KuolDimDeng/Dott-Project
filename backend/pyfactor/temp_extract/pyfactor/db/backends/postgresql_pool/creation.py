# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/db/backends/postgresql_pool/creation.py
from django.db.backends.postgresql.creation import DatabaseCreation as PostgresqlDatabaseCreation

class DatabaseCreation(PostgresqlDatabaseCreation):
    def _clone_test_db(self, suffix, verbosity, keepdb=False):
        source_database_name = self.connection.settings_dict['NAME']
        target_database_name = source_database_name + suffix
        return target_database_name