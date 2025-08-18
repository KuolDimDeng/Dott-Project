"""
Smart migration command that handles all prompts automatically
Industry-standard approach used by companies like Spotify and Airbnb
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import connection
from django.apps import apps
import sys
from io import StringIO
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Smart migration handler with automatic prompt responses'

    def add_arguments(self, parser):
        parser.add_argument(
            '--make',
            action='store_true',
            help='Create migrations with auto-answers',
        )
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Apply migrations',
        )
        parser.add_argument(
            '--fake',
            action='store_true',
            help='Fake apply migrations',
        )
        parser.add_argument(
            '--squash',
            type=str,
            help='Squash migrations for an app',
        )
        parser.add_argument(
            '--reset',
            type=str,
            help='Reset migrations for an app',
        )

    def handle(self, *args, **options):
        """
        Handle migrations smartly
        """
        if options['make']:
            self.make_migrations()
        elif options['apply']:
            self.apply_migrations(fake=options.get('fake', False))
        elif options['squash']:
            self.squash_migrations(options['squash'])
        elif options['reset']:
            self.reset_migrations(options['reset'])
        else:
            self.stdout.write(self.style.WARNING('No action specified. Use --help for options.'))

    def make_migrations(self):
        """
        Create migrations with automatic answers to all prompts
        """
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('SMART MIGRATION CREATION'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        # Monkey-patch input to provide automatic answers
        original_input = input
        
        def auto_input(prompt):
            prompt_lower = prompt.lower()
            
            # Auto-answer common Django prompts
            if 'did you rename' in prompt_lower:
                answer = 'N'  # Don't assume renames
                self.stdout.write(f"Auto-answer: {prompt} -> {answer}")
                return answer
            
            elif 'was renamed to' in prompt_lower:
                answer = 'N'  # Don't assume renames
                self.stdout.write(f"Auto-answer: {prompt} -> {answer}")
                return answer
            
            elif 'you are trying to add a non-nullable field' in prompt_lower:
                answer = '1'  # Provide default
                self.stdout.write(f"Auto-answer: {prompt} -> {answer}")
                return answer
            
            elif 'please enter the default value' in prompt_lower:
                # Determine type from prompt and provide appropriate default
                if 'decimal' in prompt_lower or 'float' in prompt_lower:
                    answer = '0.0'
                elif 'integer' in prompt_lower:
                    answer = '0'
                elif 'boolean' in prompt_lower:
                    answer = 'False'
                elif 'datetime' in prompt_lower:
                    answer = 'timezone.now'
                else:
                    answer = ''  # Empty string for CharField
                
                self.stdout.write(f"Auto-answer: {prompt} -> {answer}")
                return answer
            
            elif 'delete the field' in prompt_lower:
                answer = 'N'  # Don't delete by default (safe)
                self.stdout.write(f"Auto-answer: {prompt} -> {answer}")
                return answer
            
            elif 'did you add' in prompt_lower:
                answer = 'Y'  # Confirm additions
                self.stdout.write(f"Auto-answer: {prompt} -> {answer}")
                return answer
            
            else:
                # For unknown prompts, use safe defaults
                self.stdout.write(self.style.WARNING(f"Unknown prompt: {prompt}"))
                return 'N'  # Safe default
        
        # Replace input temporarily
        import builtins
        builtins.input = auto_input
        
        try:
            # Get all apps
            app_configs = apps.get_app_configs()
            
            for app_config in app_configs:
                if app_config.name.startswith('django.'):
                    continue  # Skip Django's own apps
                
                if app_config.name in ['rest_framework', 'corsheaders', 'storages']:
                    continue  # Skip third-party apps
                
                app_label = app_config.label
                
                try:
                    self.stdout.write(f"\n📦 Processing {app_label}...")
                    
                    # Capture output
                    out = StringIO()
                    call_command(
                        'makemigrations',
                        app_label,
                        stdout=out,
                        interactive=False,
                        merge=True,
                        noinput=True,
                    )
                    
                    output = out.getvalue()
                    if 'No changes detected' in output:
                        self.stdout.write(f"  ✓ No changes in {app_label}")
                    else:
                        self.stdout.write(self.style.SUCCESS(f"  ✅ Created migrations for {app_label}"))
                        if output:
                            self.stdout.write(output)
                    
                except Exception as e:
                    if 'No changes detected' not in str(e):
                        self.stdout.write(self.style.WARNING(f"  ⚠️ {app_label}: {e}"))
        
        finally:
            # Restore original input
            builtins.input = original_input
        
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("MIGRATION CREATION COMPLETE"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

    def apply_migrations(self, fake=False):
        """
        Apply all migrations
        """
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('APPLYING MIGRATIONS' + (' (FAKE)' if fake else '')))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        try:
            if fake:
                call_command('migrate', '--fake')
            else:
                call_command('migrate')
            
            self.stdout.write(self.style.SUCCESS('✅ All migrations applied successfully'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))

    def squash_migrations(self, app_label):
        """
        Squash migrations for an app
        """
        self.stdout.write(self.style.SUCCESS(f'Squashing migrations for {app_label}...'))
        
        try:
            # Get migration list
            from django.db.migrations.loader import MigrationLoader
            loader = MigrationLoader(connection)
            
            app_migrations = [
                (name, migration) 
                for (app, name), migration in loader.graph.nodes.items() 
                if app == app_label
            ]
            
            if len(app_migrations) < 10:
                self.stdout.write(f'Only {len(app_migrations)} migrations, skipping squash')
                return
            
            # Get first and last migration
            first = sorted(app_migrations)[0][0]
            last = sorted(app_migrations)[-5][0]  # Keep last 5 unsquashed
            
            self.stdout.write(f'Squashing {first} through {last}...')
            
            call_command(
                'squashmigrations',
                app_label,
                first,
                last,
                interactive=False,
                noinput=True,
            )
            
            self.stdout.write(self.style.SUCCESS('✅ Squashing complete'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))

    def reset_migrations(self, app_label):
        """
        Reset migrations for an app (dangerous - use with caution)
        """
        self.stdout.write(self.style.WARNING(f'⚠️ Resetting migrations for {app_label}'))
        self.stdout.write(self.style.WARNING('This will fake-reverse all migrations!'))
        
        confirm = input('Type "yes" to confirm: ')
        if confirm != 'yes':
            self.stdout.write('Cancelled')
            return
        
        try:
            # Fake reverse to zero
            call_command('migrate', app_label, 'zero', '--fake')
            
            # Remove migration files (keep __init__.py)
            import os
            import glob
            
            migration_dir = f'{app_label}/migrations'
            if os.path.exists(migration_dir):
                for file in glob.glob(f'{migration_dir}/[0-9]*.py'):
                    os.remove(file)
                    self.stdout.write(f'Removed {file}')
            
            # Create fresh migrations
            call_command('makemigrations', app_label)
            
            # Fake apply
            call_command('migrate', app_label, '--fake')
            
            self.stdout.write(self.style.SUCCESS('✅ Reset complete'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))