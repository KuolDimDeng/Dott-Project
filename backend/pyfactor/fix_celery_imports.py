#!/usr/bin/env python3
"""Remove all Celery imports and references from onboarding/views/views.py"""

import re

# Read the file
with open('onboarding/views/views.py', 'r') as f:
    content = f.read()

# Remove Celery imports
celery_import_patterns = [
    r'from celery import.*\n',
    r'from celery\..*\n',
    r'from kombu\..*\n',
    r'from \.\.tasks import.*\n',
    r'from onboarding\.tasks import.*\n',
    r'from \.tasks import.*\n',
    r'import celery.*\n',
]

for pattern in celery_import_patterns:
    content = re.sub(pattern, '', content, flags=re.MULTILINE)

# Replace AsyncResult references with dummy class
if 'AsyncResult' in content and 'class AsyncResult' not in content:
    # Add a dummy AsyncResult class after imports
    dummy_class = '''
# Dummy AsyncResult class (Celery has been removed)
class AsyncResult:
    def __init__(self, task_id):
        self.task_id = task_id
        self.status = 'PENDING'
        self.result = None
    
    def ready(self):
        return False
    
    def successful(self):
        return False
    
    def failed(self):
        return False
    
    def get(self, timeout=None):
        return None
'''
    # Find a good place to insert it (after the imports section)
    import_end = content.find('\n\n# Configure stripe')
    if import_end > 0:
        content = content[:import_end] + dummy_class + content[import_end:]

# Replace task.delay() and task.apply_async() calls with logging
task_call_patterns = [
    (r'setup_user_tenant_task\.delay\((.*?)\)', r'logger.info("Celery removed - would have called setup_user_tenant_task with args: %s", [\1])'),
    (r'setup_user_tenant_task\.apply_async\((.*?)\)', r'logger.info("Celery removed - would have called setup_user_tenant_task with args: %s", [\1])'),
    (r'send_websocket_notification\((.*?)\)', r'logger.info("Celery removed - would have sent websocket notification with args: %s", [\1])'),
]

for pattern, replacement in task_call_patterns:
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

# Write the fixed file
with open('onboarding/views/views.py', 'w') as f:
    f.write(content)

print("Fixed onboarding/views/views.py - removed all Celery references")