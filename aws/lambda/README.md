# Cognito Post Confirmation Setup

This directory contains the Lambda function that handles Cognito post-confirmation events and forwards them to your backend API.

## Setup Instructions

1. **Deploy the Lambda Function**
   ```bash
   # Create a ZIP file containing the function
   zip -r post-confirmation-trigger.zip post-confirmation-trigger.js

   # Create the Lambda function using AWS CLI
   aws lambda create-function \
     --function-name cognito-post-confirmation-trigger \
     --runtime nodejs18.x \
     --handler post-confirmation-trigger.handler \
     --zip-file fileb://post-confirmation-trigger.zip \
     --role arn:aws:iam::<your-account-id>:role/lambda-cognito-role
   ```

2. **Configure Environment Variables**
   - In the AWS Lambda console, add the following environment variable:
     - Key: `BACKEND_API_URL`
     - Value: `https://your-api-domain.com/api`

3. **Set up Cognito Trigger**
   - Go to the AWS Cognito console
   - Select your User Pool
   - Go to "User Pool Properties" > "Triggers"
   - Under "Post confirmation", select the Lambda function you created
   - Save the changes

4. **Configure IAM Role**
   - Ensure the Lambda function's IAM role has the following permissions:
     ```json
     {
         "Version": "2012-10-17",
         "Statement": [
             {
                 "Effect": "Allow",
                 "Action": [
                     "logs:CreateLogGroup",
                     "logs:CreateLogStream",
                     "logs:PutLogEvents"
                 ],
                 "Resource": "arn:aws:logs:*:*:*"
             }
         ]
     }
     ```

5. **Configure API CORS**
   - Ensure your Django API allows requests from AWS Lambda
   - Add the following to your Django settings:
     ```python
     CORS_ALLOWED_ORIGINS = [
         "https://cognito-idp.<region>.amazonaws.com",
     ]
     ```

## Testing

1. Create a new user through your application
2. Confirm the user's email
3. Check the Lambda function logs in CloudWatch
4. Verify that a user record was created in your Django database

## Troubleshooting

1. **Lambda Function Errors**
   - Check CloudWatch logs for the Lambda function
   - Verify the BACKEND_API_URL environment variable is set correctly
   - Ensure the Lambda function has internet access (VPC settings)

2. **API Errors**
   - Check your Django logs for any errors
   - Verify CORS settings are correct
   - Ensure the API endpoint is accessible from AWS Lambda

3. **Common Issues**
   - Network connectivity: Lambda function must have internet access
   - CORS: API must allow requests from AWS Lambda
   - Timeouts: Lambda function timeout should be sufficient (recommended: 30s)
   - Memory: Ensure Lambda has enough memory allocated (recommended: 128MB)