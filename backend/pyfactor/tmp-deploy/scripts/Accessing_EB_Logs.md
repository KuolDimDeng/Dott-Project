# Accessing Elastic Beanstalk Logs

## Finding the eb-engine.log File

When Elastic Beanstalk deployment fails with the error message "Instance deployment failed. For details, see 'eb-engine.log'", you can access this log in several ways:

### Method 1: SSH into the EC2 Instance (Most Direct)

1. Connect to your instance using the EB CLI:
   ```bash
   eb ssh pyfactor-dev-env-7
   ```

2. Once connected, navigate to the logs directory:
   ```bash
   cd /var/log
   ```

3. View the eb-engine.log file:
   ```bash
   sudo less /var/log/eb-engine.log
   ```
   
   Or to see just the last 100 lines:
   ```bash
   sudo tail -n 100 /var/log/eb-engine.log
   ```

### Method 2: Using the EB CLI logs Command

You can retrieve logs from your local machine using the EB CLI:

```bash
eb logs pyfactor-dev-env-7 --all
```

This will retrieve all logs, including the eb-engine.log, and download them to your local machine.

### Method 3: Through AWS Management Console

1. Open the AWS Management Console
2. Navigate to Elastic Beanstalk
3. Select your application and then the environment (pyfactor-dev-env-7)
4. Click on "Logs" in the left navigation
5. Click "Request Logs" and select "Full Logs"
6. Once generated, download and extract the logs
7. Look for the eb-engine.log file in the extracted files

### Method 4: Using the AWS CLI

If you have the AWS CLI configured, you can use:

```bash
aws elasticbeanstalk retrieve-environment-info --environment-name pyfactor-dev-env-7 --info-type tail
```

Then use the resulting URL to download the logs.

## Other Important Log Files

While checking the logs, you should also look at these files:

1. `/var/log/eb-hooks.log` - For hook script execution logs (prebuild, predeploy, postdeploy)
2. `/var/log/cfn-init.log` - CloudFormation initialization logs
3. `/var/log/web.stdout.log` - Application output logs
4. `/var/log/nginx/error.log` - Web server error logs

## Suggested Next Steps

1. First check the eb-engine.log file to identify the specific error
2. Based on the error, review and fix the appropriate configuration files
3. Re-deploy using our deployment scripts:
   ```bash
   ./scripts/eb_deploy_config.sh --skip-fixes
