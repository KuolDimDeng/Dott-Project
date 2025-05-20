# AWS Console Upload Steps

## Step 1: Access the AWS Elastic Beanstalk Console
1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to the Elastic Beanstalk service
3. Select your region (ensure it's the same region where your RDS database is located)

## Step 2: Create a New Environment
1. Click "Create a new environment"
2. Select "Web server environment"
3. Fill in the application information:
   - **Application name**: `pyfactor` (use existing) or create a new one if needed
   - **Environment name**: `pyfactor-docker-env`
   - **Domain**: Accept default or customize if needed
   - **Platform**: Select "Docker"
   - **Platform branch**: Docker running on 64bit Amazon Linux 2
   - **Platform version**: Recommended version
   - **Application code**: Choose "Upload your code"
   - Click "Upload" and select the `docker-eb-package-20250517080705.zip` file
   - Set version label to: `docker-deployment-20250517`

## Step 3: Configure Service Access
1. Select "Use an existing service role"
2. Choose your existing EB service role
3. Choose your existing EC2 instance profile

## Step 4: Configure Networking, Database and Monitoring
1. Select your VPC
2. Choose subnets that have access to your RDS database
3. For Security Groups, select the one that allows traffic to your RDS database
4. In the "Database" section, keep "No database" selected (since you're connecting to an existing RDS)
5. Set proper monitoring and health reporting

## Step 5: Review and Submit
1. Review all configurations
2. Click "Submit"
3. Wait for the environment to be created and the application to be deployed

## Step 6: Monitor Deployment
1. Watch the events in the Elastic Beanstalk console
2. Check the logs if there are any issues
3. Once deployment is complete, you should see "Health: Green"
4. Click the URL provided to access your application

## Troubleshooting
If you encounter issues:
1. Check "Logs" in the left navigation panel
2. Look for specific Docker-related errors
3. Verify that environment variables are set correctly
4. Ensure your security groups allow proper communication

## Notes
- This Docker-based deployment completely bypasses the Amazon Linux 2023 postgresql-devel dependency issues
- The Docker container includes all the necessary PostgreSQL client libraries 
- The deployment might take 5-10 minutes to complete
