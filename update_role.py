import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('/Users/kuoldeng/projectx/backend')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

# Get the Employee model directly from hr app
from pyfactor.hr.models import Employee 

print('Current user roles:')
for emp in Employee.objects.all()[:5]:
    print(f'- {emp.username}: {emp.role}')

# Get the user by username
user = Employee.objects.get(username='84e86428-5071-70f3-4776-1e7ca659bc57')
print(f'\nUpdating {user.username} from role {user.role} to OWNER')
user.role = 'owner'
user.save()
print(f'Updated: {user.username} is now role {user.role}') 