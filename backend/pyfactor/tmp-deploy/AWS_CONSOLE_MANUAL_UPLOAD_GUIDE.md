# AWS Console Manual Upload Guide for Large Deployment Packages

**Version: 1.0.0**  
**Last Updated: May 17, 2025**

This guide provides step-by-step instructions for manually uploading and deploying large application packages (over 500MB) to AWS Elastic Beanstalk via the AWS Console. This approach bypasses the EB CLI size limit of 512MB.

## Prerequisites

- An AWS account with appropriate permissions
- Access to the AWS Management Console
- Your Docker-based application package (e.g., `pyfactor-docker-deployment.zip`)

## Step 1: Upload the Package to Amazon S3

First, we'll upload the large deployment package to an S3 bucket:

1. Sign in to the AWS Management Console: https://console.aws.amazon.com
2. Navigate to the S3 service:
   - Type "S3" in the search bar or find it under "Storage" services
   - Click on "S3"

3. Create a new bucket (if you don't have one already):
   - Click "Create bucket"
   - Enter a unique bucket name (e.g., "dott-app-deployments")
   - Choose your preferred AWS Region (ideally the same region as your Elastic Beanstalk environment)
   - Keep default settings or configure as needed
   - Click "Create bucket"

4. Upload your deployment package:
   - Navigate to the bucket you created or selected
   - Click "Upload"
   - Click "Add files" and select your `pyfactor-docker-deployment.zip` file
   - Keep default settings or configure as needed
   - Click "Upload"
   - Wait for the upload to complete (this may take some time for large files)

5. Copy the S3 URL of your uploaded file:
   - Click on the uploaded file
   - In the "Properties" tab, find the "Object URL"
   - Make note of this URL, or alternatively the S3 key and bucket name

## Step 2: Create a New Application Version in Elastic Beanstalk

Next, we'll create a new application version in Elastic Beanstalk that references the S3 object:

1. Navigate to the Elastic Beanstalk service:
   - Type "Elastic Beanstalk" in the search bar or find it under "Compute" services
   - Click on "Elastic Beanstalk"

2. Select your application:
   - Click on the application name (e.g., "Dott" or "PyFactor")
   
3. Create a new application version:
   - Click on "Application versions" in the left navigation
   - Click "Create application version"
   - Enter a version label (e.g., "docker-manual-v1-YYYYMMDD")
   - For "Version source", select "Amazon S3 object"
   - Enter the S3 URL or browse to select your uploaded deployment file
   - (Optional) Add a description
   - Click "Create"

## Step 3: Deploy the New Version

Finally, we'll deploy the new version to your Elastic Beanstalk environment:

1. After the application version is created, you'll see it in the list of versions
2. Click the checkbox next to your new version
3. Click "Actions" and select "Deploy"
4. Select the environment to deploy to (e.g., "pyfactor-docker-env")
5. Review the deployment settings and click "Deploy"
6. Monitor the deployment process:
   - You'll be redirected to the environment dashboard
   - The deployment process will be shown in the "Events" tab
   - This may take several minutes (typically 5-15 minutes)

## Step 4: Verify the Deployment

Once the deployment is complete, verify that your application is running correctly:

1. Wait for the environment status to turn "Green"
2. Click on the environment URL to access your application
3. Check the "Health" tab for any issues
4. Review the "Logs" if needed:
   - Click on "Logs" in the left navigation
   - Select "Request Logs" and click "Download"

## Troubleshooting

### Deployment Fails with Health Status "Red"

If your deployment fails and the environment turns red:

1. Check the "Events" and "Logs" tabs for error messages
2. Common issues include:
   - Missing or incorrect platform settings in `.platform` directory
   - Issues with Docker container configuration
   - Environment variable or configuration problems
   - Database connection errors

### "Service Role Required" Error

If you receive an error about missing service roles:

1. Go to IAM service in AWS Console
2. Create a service role for Elastic Beanstalk with the following policies:
   - `AWSElasticBeanstalkService`
   - `AWSElasticBeanstalkEnhancedHealth`
3. Return to Elastic Beanstalk and select this role during deployment

### Long Deployment Times

For large applications:

1. Be patient - deployments of large packages can take 10+ minutes
2. Do not refresh or navigate away from the page
3. Consider splitting your application into smaller components if deployment times are consistently too long

## Next Steps

After successful deployment:

1. Set up monitoring and alarms for your environment
2. Configure auto-scaling if needed
3. Add HTTPS with AWS Certificate Manager
4. Set up a custom domain with Route 53

---

## Recommended Optimizations for Future Deployments

To improve deployment efficiency:

1. **Use a .ebignore file** to exclude unnecessary files:
   - Create a `.ebignore` file in your project root
   - Add patterns like `node_modules/`, `__pycache__/`, `.git/`, etc.

2. **Implement Docker multi-stage builds** in your Dockerfile to reduce image size

3. **Split frontend and backend** into separate applications

4. **Consider CI/CD pipelines** with AWS CodeBuild and CodePipeline to automate deployments
