# pyfactor/db/backends/postgresql_pool/base.py
from django.db.backends.postgresql.base import DatabaseWrapper as PostgresqlDatabaseWrapper
from django.db.backends.postgresql.base import Database
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_READ_COMMITTED
from ...utils import get_connection, return_connection

class DatabaseWrapper(PostgresqlDatabaseWrapper):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.isolation_level = ISOLATION_LEVEL_READ_COMMITTED

    def get_new_connection(self, conn_params):
        try:
            conn = get_connection()
            if conn:
                conn.set_session(
                    autocommit=True,
                    isolation_level=self.isolation_level,
                    readonly=False,
                    deferrable=False,
                )
            return conn
        except Exception as e:
            from django.db.utils import OperationalError
            raise OperationalError(f"Failed to get connection from pool: {str(e)}")

    def _close(self):
        if self.connection is not None:
            return_connection(self.connection)
            self.connection = None

    def close(self, *args, **kwargs):
        self._close()