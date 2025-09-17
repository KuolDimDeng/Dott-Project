# Setting Up Automated Featuring on Render

## Option 1: Render Cron Jobs (Recommended)

### Step 1: Create a new Cron Job in Render Dashboard

1. Go to your Render Dashboard
2. Click "New +" → "Cron Job"
3. Configure the cron job:

**Settings:**
- **Name**: `calculate-featuring-scores`
- **Environment**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Command**: `cd /opt/render/project/src/backend/pyfactor && python manage.py calculate_featuring_scores`
- **Schedule**: `0 2 * * *` (Daily at 2 AM UTC)
- **Runtime**: Python 3.11

### Step 2: Environment Variables
Copy all environment variables from your main web service:
- DATABASE_URL
- REDIS_URL
- SECRET_KEY
- etc.

## Option 2: Using Django Management Commands with Render Jobs

Create a file `render.yaml` in your project root:

```yaml
services:
  - type: web
    name: dott-api-staging
    env: python
    buildCommand: "./build.sh"
    startCommand: "gunicorn pyfactor.wsgi:application"

  - type: cron
    name: featuring-calculator
    env: python
    schedule: "0 2 * * *"
    buildCommand: "pip install -r backend/pyfactor/requirements.txt"
    startCommand: "cd backend/pyfactor && python manage.py calculate_featuring_scores"
    envVars:
      - fromService:
          name: dott-api-staging
          type: web
          envVarKeys:
            - DATABASE_URL
            - REDIS_URL
            - SECRET_KEY
            - AUTH0_DOMAIN
            - AUTH0_CLIENT_ID
            - AUTH0_CLIENT_SECRET
```

## Option 3: Background Worker with Celery Beat (Advanced)

### Step 1: Install Celery and Redis
```bash
pip install celery[redis] django-celery-beat
```

### Step 2: Create celery.py in your project
```python
# backend/pyfactor/pyfactor/celery.py
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

app = Celery('pyfactor')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Schedule periodic tasks
app.conf.beat_schedule = {
    'calculate-featuring-scores': {
        'task': 'marketplace.tasks.calculate_featuring_scores_task',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}
```

### Step 3: Create the task
```python
# backend/pyfactor/marketplace/tasks.py
from celery import shared_task
from django.core.management import call_command

@shared_task
def calculate_featuring_scores_task():
    """Calculate featuring scores for products and menu items"""
    call_command('calculate_featuring_scores', days=7)
    return "Featuring scores calculated successfully"
```

### Step 4: Add Celery Worker service in Render
- Service Type: Background Worker
- Start Command: `celery -A pyfactor worker -l info`

### Step 5: Add Celery Beat service in Render
- Service Type: Background Worker
- Start Command: `celery -A pyfactor beat -l info`

## Option 4: Simple Python Script (Quick Solution)

### Create a scheduled job script:
```python
# backend/pyfactor/scripts/scheduled_featuring.py
#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime

# Setup Django
sys.path.insert(0, '/opt/render/project/src/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.core.management import call_command

def run():
    print(f"[{datetime.now()}] Running featuring score calculation...")
    try:
        call_command('calculate_featuring_scores', days=7)
        print(f"[{datetime.now()}] Successfully calculated featuring scores")
    except Exception as e:
        print(f"[{datetime.now()}] Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run()
```

Then create a Render Cron Job with:
- **Command**: `python /opt/render/project/src/backend/pyfactor/scripts/scheduled_featuring.py`
- **Schedule**: `0 2 * * *`

## Verification After Setup

### 1. Manual Test (Run in Render Shell)
```bash
cd backend/pyfactor
python manage.py calculate_featuring_scores --days 7
```

### 2. Check Logs
Look for:
- "Calculating featuring scores for the last 7 days..."
- "Successfully processed X products and Y menu items"

### 3. Verify in Database
```python
python manage.py shell
from inventory.models import Product
from menu.models import MenuItem

# Check if scores are being calculated
products_with_scores = Product.objects.filter(featured_score__gt=0).count()
print(f"Products with scores: {products_with_scores}")

menu_items_with_scores = MenuItem.objects.filter(featured_score__gt=0).count()
print(f"Menu items with scores: {menu_items_with_scores}")
```

## Monitoring

### Add logging to track execution:
```python
# In your settings.py
LOGGING = {
    'handlers': {
        'featuring': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/tmp/featuring.log',
        },
    },
    'loggers': {
        'marketplace.management.commands.calculate_featuring_scores': {
            'handlers': ['featuring'],
            'level': 'INFO',
        },
    },
}
```

## Cost Considerations

- **Cron Jobs**: Charged per execution minute
- **Background Workers**: Charged continuously
- **Recommendation**: Use Cron Jobs for daily tasks (more cost-effective)

## Quick Start (Simplest Option)

1. Go to Render Dashboard
2. Click "New +" → "Cron Job"
3. Set:
   - Command: `cd backend/pyfactor && python manage.py calculate_featuring_scores`
   - Schedule: `0 2 * * *`
   - Copy environment variables from your web service
4. Deploy!

The featuring system will now automatically calculate scores daily at 2 AM UTC.