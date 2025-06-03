import time
import logging
from django.core.management.base import BaseCommand
from django.db import connections, connection

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Monitor and manage database connections'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Monitoring interval in seconds'
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Perform connection cleanup'
        )
        parser.add_argument(
            '--monitor',
            action='store_true',
            help='Continuously monitor connections'
        )

    def handle(self, *args, **options):
        interval = options['interval']
        cleanup = options['cleanup']
        monitor = options['monitor']

        if cleanup:
            self.cleanup_connections()
            return

        if monitor:
            self.stdout.write(self.style.SUCCESS(f'Starting connection monitoring every {interval} seconds'))
            try:
                while True:
                    self.monitor_connections()
                    time.sleep(interval)
            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING('Monitoring stopped'))
        else:
            self.monitor_connections()

    def monitor_connections(self):
        """Monitor current database connections"""
        try:
            with connection.cursor() as cursor:
                # Get active connections
                cursor.execute("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE datname = current_database()
                """)
                active_connections = cursor.fetchone()[0]

                # Get connection limit
                cursor.execute("SHOW max_connections")
                max_connections = cursor.fetchone()[0]

                self.stdout.write(self.style.SUCCESS(
                    f"Active connections: {active_connections}/{max_connections}"
                ))

                # Show detailed connection info if high usage
                if active_connections > int(max_connections) * 0.7:
                    cursor.execute("""
                        SELECT pid, usename, application_name, client_addr, 
                               backend_start, state, query_start, query
                        FROM pg_stat_activity
                        WHERE datname = current_database()
                        ORDER BY backend_start
                    """)
                    rows = cursor.fetchall()
                    
                    self.stdout.write(self.style.WARNING("High connection usage detected! Connection details:"))
                    for row in rows:
                        self.stdout.write(f"PID: {row[0]}, User: {row[1]}, App: {row[2]}, State: {row[5]}")
                        
                    # Suggest cleanup if needed
                    if active_connections > int(max_connections) * 0.9:
                        self.stdout.write(self.style.ERROR(
                            "Critical connection usage! Consider running with --cleanup option."
                        ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error monitoring connections: {str(e)}"))

    def cleanup_connections(self):
        """Clean up idle connections"""
        try:
            with connection.cursor() as cursor:
                # Get idle connections
                cursor.execute("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE datname = current_database() 
                    AND state = 'idle' 
                    AND query_start < NOW() - INTERVAL '10 minutes'
                """)
                idle_count = cursor.fetchone()[0]
                
                if idle_count > 0:
                    # Terminate idle connections
                    cursor.execute("""
                        SELECT pg_terminate_backend(pid) 
                        FROM pg_stat_activity 
                        WHERE datname = current_database() 
                        AND state = 'idle' 
                        AND query_start < NOW() - INTERVAL '10 minutes'
                    """)
                    
                    self.stdout.write(self.style.SUCCESS(f"Terminated {idle_count} idle connections"))
                else:
                    self.stdout.write(self.style.SUCCESS("No idle connections to terminate"))
                
                # Close all Django connections
                for conn in connections.all():
                    conn.close()
                
                self.stdout.write(self.style.SUCCESS("Closed all Django connections"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error cleaning up connections: {str(e)}"))