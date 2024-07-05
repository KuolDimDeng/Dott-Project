import os
import shutil
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Delete all migration files except __init__.py'

    def find_migration_files(self):
        migration_files = []
        for root, dirs, files in os.walk('.'):
            if 'migrations' in dirs:
                migration_path = os.path.join(root, 'migrations')
                for file in os.listdir(migration_path):
                    if file != '__init__.py':
                        migration_files.append(os.path.join(migration_path, file))
        return migration_files

    def list_files(self, files):
        self.stdout.write("The following migration files will be deleted:")
        for file in files:
            self.stdout.write(file)

    def prompt_confirmation(self):
        response = input("Are you sure you want to delete these files? (yes/no): ")
        return response.lower() == 'yes'

    def delete_files(self, files):
        for file in files:
            if os.path.isfile(file):
                os.remove(file)
                self.stdout.write(f"Deleted file: {file}")
            elif os.path.isdir(file):
                shutil.rmtree(file)
                self.stdout.write(f"Deleted directory: {file}")

    def handle(self, *args, **kwargs):
        migration_files = self.find_migration_files()
        if not migration_files:
            self.stdout.write("No migration files found to delete.")
            return

        self.list_files(migration_files)

        if self.prompt_confirmation():
            self.delete_files(migration_files)
            self.stdout.write("All specified migration files have been deleted.")
        else:
            self.stdout.write("No files were deleted.")
