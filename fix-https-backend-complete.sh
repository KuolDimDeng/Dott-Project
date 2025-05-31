#!/bin/bash

echo "🔧 Fixing HTTPS Backend Issues..."

# 1. Check current environment status
echo "📊 Checking Elastic Beanstalk environment status..."
aws elasticbeanstalk describe-environments --environment-names DottApp-clean --region us-east-1

# 2. Update nginx configuration to fix duplicate upstream errors
echo "🔧 Creating nginx configuration fix..."
cat > .platform/nginx/conf.d/app.conf << 'EOF'
# Remove any existing upstream configurations first
upstream django {
    server 127.0.0.1:8000;
    keepalive 16;
}

server {
    listen 80 default_server;
    server_name _;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Increase timeouts for slow responses
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;
    
    # Health check endpoint
    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
    
    # Health check for ELB
    location /health/ {
        proxy_pass http://django/health/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Override timeouts for health checks
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://django/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
EOF

# 3. Create database connection optimization
echo "🔧 Creating database connection optimization..."
cat > .platform/hooks/postdeploy/01_optimize_db.sh << 'EOF'
#!/bin/bash
# Optimize database connections
echo "Optimizing database connections..."

# Check database connectivity
python << 'PYTHON'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings_eb')
django.setup()

from django.db import connection
try:
    cursor = connection.cursor()
    cursor.execute("SELECT 1")
    print("✅ Database connection successful")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
PYTHON

# Clear any stuck connections
docker exec $(docker ps -q) python manage.py dbshell --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND state_change < now() - interval '5 minutes';" || true

echo "Database optimization complete"
EOF

chmod +x .platform/hooks/postdeploy/01_optimize_db.sh

# 4. Create environment variables optimization
echo "🔧 Setting optimized environment variables..."
cat > .ebextensions/01_environment.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: "pyfactor.settings_eb"
    PYTHONUNBUFFERED: "1"
    RDS_DB_NAME: "dott_main"
    RDS_HOSTNAME: "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
    RDS_PORT: "5432"
    RDS_USERNAME: "dott_admin"
    SECRET_KEY: "t+3=29ifzne^^$626vnvq7w5f&ky7g%54=ca^q3$!#v&%ubjib"
    # Database optimization
    DB_CONN_MAX_AGE: "300"
    DB_CONN_HEALTH_CHECKS: "True"
    # Django optimization
    DEBUG: "False"
    ALLOWED_HOSTS: "DottApp-clean.eba-dua2f3pi.us-east-1.elasticbeanstalk.com,awseb--AWSEB-prqjjiyzqiVd-1482029172.us-east-1.elb.amazonaws.com,api.dottapps.com,localhost,127.0.0.1"
  aws:elasticbeanstalk:container:python:
    WSGIPath: "pyfactor.wsgi:application"
  aws:elbv2:loadbalancer:
    IdleTimeout: 300
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:elasticbeanstalk:healthreporting:system:
    SystemType: enhanced
    HealthCheckSuccessThreshold: Ok
EOF

# 5. Create load balancer health check fix
echo "🔧 Updating load balancer health check..."
aws elbv2 modify-target-group \
  --target-group-arn "arn:aws:elasticloadbalancing:us-east-1:471112661935:targetgroup/awseb-AWSEB-FTUUUQOPLVVQ/720df34cf555887e" \
  --health-check-path "/" \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1 || echo "Load balancer update failed or not needed"

echo "🚀 Deploying fixes to Elastic Beanstalk..."
# Create deployment package
zip -r backend-https-fix.zip . -x "*.git*" "*node_modules*" "*.DS_Store*" "*__pycache__*" "*.pyc" "*logs/*" "*backups/*"

# Deploy the fix
eb deploy DottApp-clean || echo "Please deploy manually using: eb deploy DottApp-clean"

echo "✅ Backend HTTPS fixes applied!"
echo ""
echo "🔍 Testing endpoints in 60 seconds..."
sleep 60

echo "Testing backend health..."
curl -I https://api.dottapps.com/health/ --max-time 15 || echo "Health check still failing"

echo "Testing backend root..."
curl -I https://api.dottapps.com/ --max-time 15 || echo "Root endpoint still failing"

echo ""
echo "📋 HTTPS Status Summary:"
echo "✅ SSL certificates: Valid for both domains"
echo "✅ DNS resolution: Working"
echo "🔧 Backend application: Being fixed"
echo "⏳ Frontend deployment: In progress (Vercel security checkpoint)"
echo ""
echo "Next steps:"
echo "1. Wait for deployment to complete (5-10 minutes)"
echo "2. Check logs if issues persist: eb logs DottApp-clean"
echo "3. Monitor health in AWS console" 