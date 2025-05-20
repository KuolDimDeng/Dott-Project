# Step-by-Step Guide: Uploading Large Files to Amazon S3

**Version: 1.0.0**  
**Last Updated: May 17, 2025**

This guide provides detailed instructions specifically for uploading large deployment packages (like your 1.5GB Docker package) to Amazon S3 using the AWS Console.

## Prerequisites

- AWS account with access to the AWS Management Console
- Your prepared deployment package (e.g., `docker-eb-manual-20250517213206.zip`)
- Basic familiarity with AWS services

## Step 1: Access the S3 Console

1. Open your web browser and navigate to [https://console.aws.amazon.com](https://console.aws.amazon.com)
2. Sign in with your AWS account credentials
3. In the AWS Management Console, locate the search bar at the top
4. Type "S3" and select "S3" from the dropdown menu

![AWS Console Search](https://aws-docs-example-images.com/console-search-s3.png)

## Step 2: Create a Bucket (if you don't have one already)

1. In the S3 console, click the "Create bucket" button
2. Enter a **Bucket name** - this must be globally unique across all AWS accounts
   - Example: `dott-app-deployments-YOURUSERNAME` (replace YOURUSERNAME with something unique)
   - Good practice: Use your company name or project name plus a unique identifier
3. Select the **AWS Region** that is closest to your users or matches your Elastic Beanstalk environment region
4. Configure bucket settings:
   - Block all public access: Keep this enabled for security (default)
   - Bucket versioning: Consider enabling this to keep file history
   - Leave other settings as default
5. Click "Create bucket"

![Create S3 Bucket](https://aws-docs-example-images.com/s3-create-bucket.png)

## Step 3: Upload Your Deployment Package

1. Click on the name of your newly created bucket to open it
2. Inside the bucket, click the "Upload" button
3. In the Upload window, click "Add files" (or drag and drop your file)
4. Navigate to your deployment package location:
   - If you used our preparation script: `/Users/kuoldeng/projectx/backend/pyfactor/docker-eb-manual-*.zip`
   - Select your deployment package file
5. Configure upload settings (optional, can leave as defaults):
   - Permissions: Keep "Don't grant public read access" (default)
   - Properties: Standard storage class is fine for temporary deployment files
   - Additional upload options: Can be left as defaults

![S3 Upload Dialog](https://aws-docs-example-images.com/s3-upload-dialog.png)

6. Click "Upload" to start the upload process
7. For large files (1.5GB+), this may take several minutes depending on your internet connection
8. **DO NOT** close the browser window during upload
9. You'll see a progress bar showing the upload status

![S3 Upload Progress](https://aws-docs-example-images.com/s3-upload-progress.png)

## Step 4: Verify Upload and Get the S3 URL

1. Once the upload completes, you'll see a success message
2. Your file will now appear in the bucket's file list
3. Click on your uploaded file to see its details
4. In the Object details page, note down the following information:
   - **S3 URI**: Looks like `s3://your-bucket-name/your-file.zip`
   - **Object URL**: The HTTPS URL for your object
   - **Bucket name**: The name of your bucket
   - **Key**: The path/name of your object within the bucket

![S3 Object Details](https://aws-docs-example-images.com/s3-object-details.png)

## Step 5: Configure Permissions (if needed)

For Elastic Beanstalk deployments, AWS needs to be able to read your deployment package:

1. If you're using the same AWS account for S3 and Elastic Beanstalk, no additional permissions are needed
2. If you want to verify permissions:
   - Select your uploaded file
   - Click the "Permissions" tab 
   - Under "Access control list (ACL)", ensure your AWS account has Read permissions

## Step 6: Prepare for Elastic Beanstalk Deployment

Note down this information for use in the next step (creating an Elastic Beanstalk application version):

- **Bucket name**: `your-bucket-name`
- **Object key**: `your-file.zip`
- **S3 URL**: The full URL to your S3 object

## Alternative Method: Using AWS CLI (For Advanced Users)

If you prefer using the command line and have the AWS CLI installed:

```bash
# Configure AWS CLI (if not already done)
aws configure

# Upload file to S3
aws s3 cp /path/to/your/package.zip s3://your-bucket-name/package.zip

# Verify the file was uploaded
aws s3 ls s3://your-bucket-name/
```

## Troubleshooting S3 Uploads

### Upload Fails or Is Very Slow

1. **Connection issues**: Check your internet connection
2. **Timeout**: For very large files, consider using the AWS CLI with multipart upload
3. **AWS credentials**: Ensure your AWS credentials have permission to write to S3

### "Access Denied" Error

1. Check that you have the correct permissions on your AWS account
2. Verify the bucket policy doesn't restrict uploads
3. Ensure you're signed in to the correct AWS account

## Next Steps

After successfully uploading to S3, continue with:

1. Navigate to the Elastic Beanstalk console
2. Create a new application version referencing your S3 file
3. Deploy the application version to your environment

These steps are detailed in our companion guide: `AWS_CONSOLE_MANUAL_UPLOAD_GUIDE.md`
