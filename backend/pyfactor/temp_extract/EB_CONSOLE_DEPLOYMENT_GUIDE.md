# AWS Elastic Beanstalk Console Deployment Guide

This guide provides step-by-step instructions for deploying the Pyfactor backend to AWS Elastic Beanstalk using the AWS console with our optimized deployment package.

## Understanding the Issue

The previous deployment attempts failed with errors during instance setup. The root issue was related to Python dependency conflicts, specifically around `urllib3` and AWS SDK components (`boto3`, `botocore`). The error occurred because:

1. Elastic Beanstalk uses Python 3.9 on Amazon Linux 2023
2. With Python 3.9, `boto3/botocore` require `urllib3<1.27.0`
3. Some of our dependencies were requesting newer versions of `urllib3`

## Our Solution

We've created an optimized deployment package that:

1. Includes enhanced hook scripts with improved error handling and logging
2. Forces compatible versions of critical dependencies 
3. Provides better visibility into the deployment process
4. Implements a more reliable deployment approach through the console

## Preparation Steps

1. Create the optimized deployment package:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./scripts/prepare_eb_package.sh
```

This will generate a file called `optimized-eb-package.zip` in the pyfactor directory.

## Console Deployment Steps

### Step 1: Access AWS Elastic Beanstalk Console

1. Log into the AWS Management Console
2. Navigate to Elastic Beanstalk service
3. Select the appropriate region (us-west-2)

### Step 2: Create a New Application or Environment

1. Click "Create application" if you don't have an application yet, or "Create environment" if you do
2. Choose "Web server environment"

### Step 3: Configure Environment

1. **Application information**:
   - Application name: `pyfactor` (or a new name if you want a fresh start)

2. **Environment information**:
   - Environment name: `pyfactor-prod` (or your preferred name)
   - Domain: Leave as default or customize if needed

3. **Platform**:
   - Platform type: Select "Managed platform"
   - Platform: Select "Python"
   - Platform branch: Select "Python 3.9 running on 64bit Amazon Linux 2023/4.5.1"
   - Platform version: Use the latest version

4. **Application code**:
   - Select "Upload your code"
   - Choose "Local file" and upload the `optimized-eb-package.zip` file
   - Version label: You can use a descriptive name like "v1-optimized-dependencies"

5. **Presets**:
   - Choose "Single instance (free tier eligible)" for testing, or "High availability" for production

### Step 4: Configure Service Access

1. Ensure you have an appropriate service role and EC2 key pair
2. If you don't have them set up, follow the AWS prompts to create them

### Step 5: Set up Environment Variables

This is a critical step! You need to set up the following environment variables:

1. **Database Credentials**:
   - `RDS_DB_NAME`: Your database name
   - `RDS_USERNAME`: Your database username
   - `RDS_PASSWORD`: Your database password
   - `RDS_HOSTNAME`: Your RDS endpoint
   - `RDS_PORT`: 5432 (for PostgreSQL)

2. **Django Settings**:
   - `DJANGO_SETTINGS_MODULE`: pyfactor.settings_eb
   - `DJANGO_SECRET_KEY`: Your secret key

3. **AWS Settings**:
   - `AWS_REGION`: us-west-2 (or your chosen region)

### Step 6: Configure Networking, Database, and Tags (Optional)

1. You can set up a database here, or use an existing one by providing the connection details in Step 5
2. Configure VPC settings if needed

### Step 7: Configure Instance Traffic and Scaling (Optional)

1. For initial deployment, the defaults should work well
2. You can adjust these based on your needs later

### Step 8: Finalize and Create

1. Review all your settings
2. Click "Create environment"
3. AWS will now create your environment and deploy your application

## Monitoring the Deployment

1. The console will show a progress bar and events as they occur
2. Wait for the deployment to complete (it may take 5-10 minutes)
3. If successful, you'll see a green checkmark and your application URL
4. If there are errors, you can view them in the "Events" or "Logs" sections

## Troubleshooting

If deployment fails, follow these steps:

1. **Check the environment events** in the AWS Console:
   - Look for specific error messages

2. **View logs** in the AWS Console:
   - Click on "Logs" in the left navigation
   - Request "Last 100 lines of logs" or "Full logs"
   - Look for errors in these log files:
     - `/var/log/eb-engine.log` (Elastic Beanstalk engine logs)
     - `/var/log/eb-hooks.log` (Hook script execution)
     - `/var/log/eb-prebuild.log` (Our custom prebuild logs)
     - `/var/log/eb-predeploy.log` (Our custom predeploy logs)
     - `/var/log/eb-postdeploy.log` (Our custom postdeploy logs)

3. **Common issues and solutions**:

   - **Database connection failures**:
     - Verify your RDS credentials are correct in environment variables
     - Ensure security groups allow access from the Elastic Beanstalk instances

   - **Dependency conflicts**:
     - The optimized package should resolve these, but if issues persist, check the logs
     - Focus on any error messages related to pip or package installation

   - **Migration errors**:
     - Check the logs for SQL errors or Django migration issues
     - You may need to manually connect to the instance to fix migrations

4. **Connect to the instance** if needed:
   - Use the "SSH" button in the console, or
   - Run `eb ssh` from the command line (requires EB CLI)

## Maintenance

Once your application is deployed, you can:

1. **Update the application**:
   - Generate a new optimized package
   - Upload it through the console

2. **Configure auto-scaling**:
   - Adjust instance types and scaling settings as needed

3. **Set up monitoring**:
   - Configure CloudWatch alarms
   - Set up health checks

## Additional Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html)
- [Django on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-python-django.html)
- [Elastic Beanstalk Environment Variables](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-softwaresettings.html)
