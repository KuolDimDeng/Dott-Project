import os
import sys

# Add the project root directory to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
sys.path.insert(0, project_root)

# Add the directory containing the 'pyfactor' module to the Python path
pyfactor_dir = os.path.abspath(os.path.join(project_root, 'backend', 'pyfactor'))
sys.path.insert(0, pyfactor_dir)

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pyfactor.settings")
django.setup()

print("Script started")

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.conf import settings
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def create_nextauth_tables():
    logging.info("Starting to create NextAuth.js tables")
    
    try:
        # Connect to your PostgreSQL database
        logging.info("Attempting to connect to the database")
        conn = psycopg2.connect(
            dbname=settings.DATABASES['default']['NAME'],
            user=settings.DATABASES['default']['USER'],
            password=settings.DATABASES['default']['PASSWORD'],
            host=settings.DATABASES['default']['HOST'],
            port=settings.DATABASES['default']['PORT']
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        logging.info("Successfully connected to the database")

        # Create a cursor object
        cur = conn.cursor()

        # SQL commands to create NextAuth.js tables
        commands = (
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                email_verified TIMESTAMP,
                image VARCHAR(255),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS accounts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                provider VARCHAR(255) NOT NULL,
                provider_account_id VARCHAR(255) NOT NULL,
                refresh_token TEXT,
                access_token TEXT,
                expires_at BIGINT,
                token_type VARCHAR(255),
                scope VARCHAR(255),
                id_token TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(provider, provider_account_id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires TIMESTAMP NOT NULL,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS verification_tokens (
                identifier VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (identifier, token)
            )
            """
        )

        # Execute each command
        for i, command in enumerate(commands, 1):
            logging.info(f"Executing command {i} of {len(commands)}")
            cur.execute(command)
            logging.info(f"Command {i} executed successfully")

        # Close communication with the database
        cur.close()
        conn.close()
        logging.info("Database connection closed")

        logging.info("NextAuth.js tables created successfully.")
        return True

    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        return False
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        return False

if __name__ == "__main__":
    success = create_nextauth_tables()
    if not success:
        logging.error("Failed to create NextAuth.js tables")
        sys.exit(1)
    sys.exit(0)

print("Script ended")