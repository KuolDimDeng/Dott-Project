# Guide for Manually Uploading to AWS Elastic Beanstalk

## Package Created

The minimal package has been successfully created:
- **File**: `/Users/kuoldeng/projectx/backend/pyfactor/minimal-fixed-package-20250516214624.zip`
- **Size**: 0.48 MB (well under AWS Console's 500MB limit)
- **Contains**: Fixed PostgreSQL dependencies for Amazon Linux 2023

## Steps to Upload to AWS Elastic Beanstalk Console

1. **Log in to your AWS Console**
   - Go to https://console.aws.amazon.com/
   - Sign in with your AWS credentials
   
2. **Navigate to Elastic Beanstalk**
   - From the AWS services dashboard, find and select "Elastic Beanstalk"
   - Or use direct link: https://console.aws.amazon.com/elasticbeanstalk/
   
3. **Select your Application/Environment**
   - From the list of applications, select your application
   - Navigate to the environment that needs the update
   
4. **Upload and Deploy**
   - In the environment dashboard, click the "Upload and deploy" button
   - A dialog box will appear for uploading your application code
   
5. **Choose the Package File**
   - Click "Choose file" or "Browse" button
   - Navigate to `/Users/kuoldeng/projectx/backend/pyfactor/`
   - Select `minimal-fixed-package-20250516214624.zip`
   
6. **Add Version Label**
   - In the "Version label" field, enter a descriptive name
   - Suggested: `fixed-postgresql-al2023-20250516`
   
7. **Deploy**
   - Click the "Deploy" button to start the deployment process
   - AWS Elastic Beanstalk will upload your package and begin the deployment
   
8. **Monitor Deployment**
   - The environment dashboard will show the deployment progress
   - You can view events and logs during deployment
   - Wait for the deployment to complete (this may take several minutes)
   
9. **Verify Success**
   - After deployment completes, check the environment health
   - Verify that it shows "OK" status (green)
   - Check for any error messages in the event log

## Troubleshooting

If deployment fails, check the following:

1. **View Deployment Logs**
   - In the environment dashboard, go to "Logs"
   - Request and download the full logs
   - Look for errors related to PostgreSQL dependencies

2. **Common Issues**
   - If seeing errors about missing PostgreSQL packages, verify your package includes the fixed `.ebextensions/02_packages.config` file
   - If database connection errors occur, verify that environment variables for database connections are properly set

3. **Health Check Issues**
   - If environment goes red due to health check failures, check the health check configuration
   - You may need to adjust health check paths or timeouts in the environment configuration

## Next Steps

After successful deployment:

1. Test your application thoroughly, especially features that interact with the PostgreSQL database
2. Monitor the application logs for any warnings or errors related to database connections
3. Record deployment details for future reference
