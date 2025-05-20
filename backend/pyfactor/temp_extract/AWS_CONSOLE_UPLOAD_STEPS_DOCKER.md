# AWS Console Upload Steps for Docker Deployment

## Important: Use the Fixed Deployment Package
The original Docker deployment package contains incompatible configurations for Docker platforms. Please use the latest fixed deployment package:

**docker-eb-package-setuptools-fixed-20250517105943.zip** (created on May 17, 2025 at 11:23)

This package fixes eight critical issues:

1. Removed the unsupported static files configuration (`aws:elasticbeanstalk:environment:proxy:staticfiles`)
2. Changed proxy server from 'apache' to 'nginx' (Docker on AL2023 only supports 'nginx' or 'none')
3. Fixed port mismatch by changing application port from 8000 to 8080 to match Elastic Beanstalk's expected configuration
4. Removed unsupported WSGI parameters (`WSGIPath`, `NumProcesses`, `NumThreads`) that are not compatible with Docker platform
5. Fixed shell script syntax error in PostgreSQL installation script that was causing deployment failure
6. Updated Dockerfile to ensure Python is properly installed and fixed syntax errors in dependencies installation script
7. Added Python installer that runs before other prebuild hooks to ensure Python is available during deployment
8. Fixed setuptools uninstall error by using --ignore-installed flag for system-installed packages

## Step-by-Step Upload Process

### Step 1: Access the AWS Elastic Beanstalk Console
1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to the Elastic Beanstalk service
3. Select your region (ensure it's the same region where your RDS database is located)

### Step 2: Create a New Environment 
1. Click "Create new environment"
2. Select "Web server environment"
3. Fill in the following information:
   - Application name: Dott
   - Environment name: pyfactor-docker-env (or your preferred name)
   - Domain: (leave as default or customize)
   - Platform: Docker
   - Platform branch: Docker running on 64bit Amazon Linux 2023
   - Platform version: 4.5.1 (or the latest version)
   - Application code: Upload your code
      - Choose the file: **docker-eb-package-setuptools-fixed-20250517105943.zip** (created on May 17, 2025 at 11:23)
   
### Step 3: Configure Service Access
1. Use existing service role or create a new one
2. EC2 instance profile: aws-elasticbeanstalk-ec2-role
3. EC2 key pair: dott-key-pair (or your preferred key pair)

### Step 4: Set Up Networking, Database, and Tags
1. Configure VPC: Default VPC or your custom VPC
2. Public IP address: Enabled
3. If you're integrating with an RDS database, configure the database settings

### Step 5: Configure Instance Traffic and Scaling 
1. Instance type: t3.small (as recommended in our configuration)
2. IMDSv1: Deactivated (as specified in our configuration)
3. Root volume: Default
4. Capacity: Single instance (or multiple instances if needed)

### Step 6: Configure Updates, Monitoring, and Logging
1. Platform software:
   - **Proxy server: nginx** (This is critical)
2. CloudWatch logs:
   - Rotation: Enabled
   - Retention: 7 days (as specified in our configuration)
3. Email notifications: Your support email

### Step 7: Review and Create
1. Review all settings
2. Click "Create environment"

## Post-Deployment Steps

1. Monitor the environment creation process
2. Check logs for any deployment issues
3. Verify that the application is responding
4. Set up any required environment variables

## Troubleshooting

If you encounter issues with the deployment:
1. Check the environment health
2. View logs: Go to Environment → Logs
3. Refer to the Docker_Deployment_Fix.md documentation for more details

## Important Notes

- The Docker platform in Elastic Beanstalk uses the Dockerfile in your application to build and run the container
- Static files must be handled internally within the container, not through the elasticbeanstalk:environment:proxy:staticfiles configuration
- Always select 'nginx' (not 'apache') for the proxy server setting when using Docker deployments
