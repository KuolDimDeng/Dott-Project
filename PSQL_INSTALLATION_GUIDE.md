# PostgreSQL Client Installation for Render

## Permanent Solution (Recommended)

The Dockerfile has been updated to include `postgresql-client` in the system dependencies. This ensures psql is always available in your Render shell.

### Changes Made:
1. Updated `backend/pyfactor/Dockerfile` to include `postgresql-client` in the apt-get install command
2. This will be applied on your next deployment

## Temporary Solution (For Current Shell)

If you need psql immediately in your current Render shell:

```bash
# Run this command in your Render shell
apt-get update && apt-get install -y postgresql-client
```

Or use the provided script:
```bash
cd /opt/render/project/src
bash install_psql.sh
```

## After Installation

Once psql is installed, you can use:

```bash
python manage.py dbshell
```

This will connect you directly to your PostgreSQL database where you can run SQL commands.

## Alternative: Using Django Shell

If you can't install psql, you can always use the Django shell with raw SQL:

```bash
python manage.py shell
```

Then:
```python
from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("YOUR SQL COMMAND HERE")
    results = cursor.fetchall()
    print(results)
```

## Next Deployment

After your next deployment (triggered by pushing changes), psql will be permanently available in all Render shells for your service.