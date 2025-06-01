#!/bin/bash
# Render Migration Commands
# Run these commands in your Render service shell after deployment

echo "🚀 Starting Django migrations on Render PostgreSQL..."

# 1. Run Django migrations
python backend/pyfactor/manage.py migrate

# 2. Create superuser (optional - you can do this manually)
# python backend/pyfactor/manage.py createsuperuser

# 3. Collect static files (if needed)
python backend/pyfactor/manage.py collectstatic --noinput

# 4. Test database connection
python backend/pyfactor/manage.py check --database default

echo "✅ Migration completed!"
echo ""
echo "📝 Next steps:"
echo "1. Create a superuser: python backend/pyfactor/manage.py createsuperuser"
echo "2. Test your API endpoints"
echo "3. Update your frontend to use the new Render backend URL" 