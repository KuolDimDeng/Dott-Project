#!/usr/bin/env python
"""
Script to fix migration dependencies between apps.

This script:
1. Identifies circular or incorrect dependencies between migrations
2. Fixes the dependency order by updating the migration files
3. Resets the migration history to ensure migrations are applied in the correct order

Usage:
    python fix_migration_dependencies.py [--dry-run]

Options:
    --dry-run  Only show what would be done, don't make any changes
"""

import os
import sys
import django
import argparse
import logging
import re
import json
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s %(asctime)s %(name)s %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.conf import settings
from django.apps import apps

def get_migration_files():
    """Get all migration files in the project."""
    migration_files = []
    
    for app_config in apps.get_app_configs():
        migrations_dir = os.path.join(app_config.path, 'migrations')
        if os.path.exists(migrations_dir):
            for filename in os.listdir(migrations_dir):
                if filename.endswith('.py') and not filename.startswith('__'):
                    migration_path = os.path.join(migrations_dir, filename)
                    migration_files.append({
                        'app': app_config.label,
                        'name': filename[:-3],  # Remove .py extension
                        'path': migration_path
                    })
    
    return migration_files

def parse_dependencies(migration_path):
    """Parse dependencies from a migration file."""
    with open(migration_path, 'r') as f:
        content = f.read()
    
    # Extract dependencies using regex
    dependencies_match = re.search(r'dependencies\s*=\s*\[(.*?)\]', content, re.DOTALL)
    if not dependencies_match:
        return []
    
    dependencies_str = dependencies_match.group(1)
    dependencies = []
    
    # Extract each dependency tuple
    for match in re.finditer(r'\(\s*[\'"]([^\'"]+)[\'"]\s*,\s*[\'"]([^\'"]+)[\'"]\s*\)', dependencies_str):
        app, migration = match.groups()
        dependencies.append((app, migration))
    
    return dependencies

def update_dependencies(migration_path, new_dependencies):
    """Update dependencies in a migration file."""
    with open(migration_path, 'r') as f:
        content = f.read()
    
    # Format new dependencies
    deps_str = '[\n        ' + ',\n        '.join([f"('{app}', '{name}')" for app, name in new_dependencies]) + '\n    ]'
    
    # Replace dependencies in the file
    new_content = re.sub(r'dependencies\s*=\s*\[.*?\]', f'dependencies = {deps_str}', content, flags=re.DOTALL)
    
    with open(migration_path, 'w') as f:
        f.write(new_content)

def build_dependency_graph(migration_files):
    """Build a dependency graph from migration files."""
    graph = {}
    
    for migration in migration_files:
        key = (migration['app'], migration['name'])
        dependencies = parse_dependencies(migration['path'])
        graph[key] = {
            'dependencies': dependencies,
            'path': migration['path']
        }
    
    return graph

def detect_circular_dependencies(graph):
    """Detect circular dependencies in the graph."""
    visited = set()
    path = []
    
    def dfs(node):
        visited.add(node)
        path.append(node)
        
        for dep in graph[node]['dependencies']:
            if dep in graph:  # Only consider dependencies that are in our graph
                if dep in path:  # Circular dependency found
                    return path[path.index(dep):] + [dep]
                if dep not in visited:
                    cycle = dfs(dep)
                    if cycle:
                        return cycle
        
        path.pop()
        return None
    
    for node in graph:
        if node not in visited:
            cycle = dfs(node)
            if cycle:
                return cycle
    
    return None

def fix_circular_dependencies(graph, dry_run=False):
    """Fix circular dependencies in the graph."""
    cycle = detect_circular_dependencies(graph)
    
    if not cycle:
        logger.info("No circular dependencies found.")
        return False
    
    logger.info(f"Found circular dependency: {' -> '.join([f'{app}.{name}' for app, name in cycle])}")
    
    # Find the problematic dependency
    # For simplicity, we'll break the cycle by removing the dependency from the last node to the first
    last_node = cycle[-1]
    first_node = cycle[0]
    
    logger.info(f"Breaking dependency from {last_node[0]}.{last_node[1]} to {first_node[0]}.{first_node[1]}")
    
    if dry_run:
        logger.info("Dry run: Not making any changes.")
        return True
    
    # Remove the dependency
    new_dependencies = [dep for dep in graph[last_node]['dependencies'] if dep != first_node]
    
    # Update the migration file
    update_dependencies(graph[last_node]['path'], new_dependencies)
    
    logger.info(f"Updated dependencies in {graph[last_node]['path']}")
    
    return True

# Add this function to fix_migration_dependencies.py
def ensure_user_depends_on_custom_auth():
    """Ensure users app migrations properly depend on custom_auth migrations."""
    logger.info("Checking users migration dependencies...")
    
    # Find the users and custom_auth initial migrations
    users_migration = None
    custom_auth_migration = None
    
    for app_config in apps.get_app_configs():
        if app_config.label == 'users':
            migrations_dir = os.path.join(app_config.path, 'migrations')
            for filename in os.listdir(migrations_dir):
                if filename == '0001_initial.py':
                    users_migration = os.path.join(migrations_dir, filename)
        
        if app_config.label == 'custom_auth':
            migrations_dir = os.path.join(app_config.path, 'migrations')
            for filename in os.listdir(migrations_dir):
                if filename == '0001_initial.py':
                    custom_auth_migration = os.path.join(migrations_dir, filename)
    
    if not users_migration or not custom_auth_migration:
        logger.error("Could not find users or custom_auth initial migrations.")
        return False
    
    # Check if users depends on custom_auth
    users_deps = parse_dependencies(users_migration)
    has_dependency = ('custom_auth', '0001_initial') in users_deps
    
    if not has_dependency:
        logger.info("Users migration does not depend on custom_auth, fixing...")
        
        # Add the dependency
        users_deps.append(('custom_auth', '0001_initial'))
        update_dependencies(users_migration, users_deps)
        
        logger.info(f"Updated dependencies in {users_migration}")
        return True
    else:
        logger.info("Users migration already depends on custom_auth correctly.")
        return False


def fix_onboarding_business_dependency(dry_run=False):
    """Fix the specific dependency issue between onboarding and business apps."""
    # Find the onboarding and business initial migrations
    onboarding_migration = None
    business_migration = None
    
    for app_config in apps.get_app_configs():
        if app_config.label == 'onboarding':
            migrations_dir = os.path.join(app_config.path, 'migrations')
            if os.path.exists(migrations_dir):
                for filename in os.listdir(migrations_dir):
                    if filename == '0001_initial.py':
                        onboarding_migration = os.path.join(migrations_dir, filename)
        
        if app_config.label == 'business':
            migrations_dir = os.path.join(app_config.path, 'migrations')
            if os.path.exists(migrations_dir):
                for filename in os.listdir(migrations_dir):
                    if filename == '0001_initial.py':
                        business_migration = os.path.join(migrations_dir, filename)
    
    if not onboarding_migration or not business_migration:
        logger.error("Could not find onboarding or business initial migrations.")
        return False
    
    logger.info(f"Found onboarding initial migration: {onboarding_migration}")
    logger.info(f"Found business initial migration: {business_migration}")
    
    # Check if onboarding depends on business
    onboarding_deps = parse_dependencies(onboarding_migration)
    business_deps = parse_dependencies(business_migration)
    
    onboarding_depends_on_business = ('business', '0001_initial') in onboarding_deps
    business_depends_on_onboarding = ('onboarding', '0001_initial') in business_deps
    
    if onboarding_depends_on_business and business_depends_on_onboarding:
        logger.info("Found circular dependency between onboarding and business.")
        
        if dry_run:
            logger.info("Dry run: Not making any changes.")
            return True
        
        # Remove the dependency from business to onboarding
        new_business_deps = [dep for dep in business_deps if dep != ('onboarding', '0001_initial')]
        update_dependencies(business_migration, new_business_deps)
        
        logger.info(f"Updated dependencies in {business_migration}")
        return True
    
    if not onboarding_depends_on_business and not business_depends_on_onboarding:
        logger.info("No dependency between onboarding and business found.")
        return False
    
    if onboarding_depends_on_business:
        logger.info("Onboarding already depends on business, which is correct.")
        return False
    
    if business_depends_on_onboarding:
        logger.info("Business depends on onboarding, which is incorrect.")
        
        if dry_run:
            logger.info("Dry run: Not making any changes.")
            return True
        
        # Remove the dependency from business to onboarding
        new_business_deps = [dep for dep in business_deps if dep != ('onboarding', '0001_initial')]
        update_dependencies(business_migration, new_business_deps)
        
        # Add dependency from onboarding to business
        if ('business', '0001_initial') not in onboarding_deps:
            onboarding_deps.append(('business', '0001_initial'))
            update_dependencies(onboarding_migration, onboarding_deps)
        
        logger.info(f"Updated dependencies in {business_migration} and {onboarding_migration}")
        return True
    
    return False

def reset_migrations(dry_run=False):
    """Reset migrations in the database."""
    if dry_run:
        logger.info("Dry run: Not resetting migrations.")
        return
    
    with connection.cursor() as cursor:
        # Get all migrations for relevant apps
        cursor.execute("""
            SELECT app, name
            FROM django_migrations
            WHERE app IN ('onboarding', 'business', 'users', 'custom_auth')
            ORDER BY id
        """)
        migrations = cursor.fetchall()
        
        logger.info(f"Found {len(migrations)} migrations for relevant apps.")
        
        # Delete these migrations
        cursor.execute("""
            DELETE FROM django_migrations
            WHERE app IN ('onboarding', 'business', 'users', 'custom_auth')
        """)
        
        logger.info("Deleted migrations for relevant apps.")

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description='Fix migration dependencies')
    parser.add_argument('--dry-run', action='store_true', help='Only show what would be done, don\'t make any changes')
    args = parser.parse_args()
    
    logger.info("Checking for migration dependency issues...")

     # Add this before other fixes
    fixed_users_dependency = ensure_user_depends_on_custom_auth()
    
    # Fix the specific issue between onboarding and business
    fixed_specific = fix_onboarding_business_dependency(dry_run=args.dry_run)
    
    # Check for other circular dependencies
    migration_files = get_migration_files()
    graph = build_dependency_graph(migration_files)
    fixed_circular = fix_circular_dependencies(graph, dry_run=args.dry_run)
    
    if fixed_users_dependency or fixed_specific or fixed_circular:
        logger.info("Fixed migration dependency issues.")
        
        # Reset migrations
        reset_migrations(dry_run=args.dry_run)
        
        logger.info("You should now run migrations again to apply them in the correct order.")
    else:
        logger.info("No migration dependency issues found.")

if __name__ == '__main__':
    main()