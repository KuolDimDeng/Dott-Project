import os
import django
import sys

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def main():
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM information_schema.columns WHERE table_name = 'users_business'")
        columns = cursor.fetchall()
        
        print("Users Business Table Columns:")
        for col in columns:
            print(f"Column Name: {col[3]}, Data Type: {col[7]}")

if __name__ == "__main__":
    main() 