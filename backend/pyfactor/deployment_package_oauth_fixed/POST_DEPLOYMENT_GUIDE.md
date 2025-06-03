# Post-Deployment Guide for AWS Elastic Beanstalk Application

This guide outlines the essential steps to take after successfully deploying your application to AWS Elastic Beanstalk. Following these steps will help ensure your application is running correctly, securely, and efficiently.

## 1. Initial Verification

### Application Health Check

- **Verify Environment Health**: 
  ```bash
  aws elasticbeanstalk describe-environments --environment-names Dott-env --query "Environments[0].{Status:Status,Health:Health}"
  ```
  Ensure the status is "Ready" and health is "Green/Ok"

- **Access Application URL**:
  ```bash
  aws elasticbeanstalk describe-environments --environment-names Dott-env --query "Environments[0].CNAME" --output text
  ```
  Open this URL in your browser to verify your application loads properly

### Functionality Testing

- Run through core functionality to ensure all features are working as expected
- Test authentication flows with Cognito
- Verify tenant isolation with RLS (Row-Level Security) is working
- Check that API endpoints are responding correctly

### Log Review

Use the logs script to check for errors or warnings:
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./aws_eb_logs.sh --env-name Dott-env --recent --filter "ERROR|WARNING"
```

## 2. Setup Monitoring and Alerting

### CloudWatch Alarms

Set up CloudWatch alarms for critical metrics:

```bash
# Example: Create alarm for high CPU usage
aws cloudwatch put-metric-alarm \
  --alarm-name Dott-env-HighCPU \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --period 300 \
  --statistic Average \
  --threshold 80 \
  --alarm-description "Alarm when CPU exceeds 80%" \
  --dimensions "Name=AutoScalingGroupName,Value=YOUR_ASG_NAME" \
  --alarm-actions "YOUR_SNS_TOPIC_ARN"
```

### Dashboard Creation

Create a CloudWatch dashboard for your application:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name DottApplicationDashboard \
  --dashboard-body file://dashboard-config.json
```

> Create a `dashboard-config.json` file with appropriate widgets for CPU, memory, network I/O, and application-specific metrics.

### Log Metrics

Configure CloudWatch Logs Insights for analyzing application patterns:

```bash
aws logs put-metric-filter \
  --log-group-name /aws/elasticbeanstalk/Dott-env \
  --filter-name ErrorCount \
  --filter-pattern "ERROR" \
  --metric-transformations \
      metricName=ErrorCount,metricNamespace=DottApp/Errors,metricValue=1,defaultValue=0
```

## 3. Security Hardening

### SSL Configuration

Ensure your application is served over HTTPS:

1. Request or import SSL certificate in AWS Certificate Manager
2. Configure your EB environment to use HTTPS:

```bash
aws elasticbeanstalk update-environment \
  --environment-name Dott-env \
  --option-settings file://https-config.json
```

> Create a `https-config.json` file with proper HTTPS configuration.

### Security Group Review

Review and tighten security groups:

```bash
# List security groups
aws ec2 describe-security-groups --group-ids $(aws elasticbeanstalk describe-environment-resources --environment-name Dott-env --query "EnvironmentResources.Instances[0].SecurityGroups[*]" --output text)

# Restrict access as needed
aws ec2 revoke-security-group-ingress --group-id YOUR_SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
```

### IAM Role Review

Review and adjust IAM roles for principle of least privilege:

```bash
aws iam get-role --role-name YOUR_EB_ROLE_NAME
```

### Cognito Security Review

- Verify Cognito user pool settings are correctly configured
- Ensure proper attribute validation in Cognito
- Check that `CognitoAttributes` utility is being used as required

## 4. Performance Optimization

### Auto-scaling Configuration

Configure auto-scaling based on actual application metrics:

```bash
aws elasticbeanstalk update-environment \
  --environment-name Dott-env \
  --option-settings file://scaling-config.json
```

> Create a `scaling-config.json` file with appropriate scaling triggers.

### Database Optimization

- Review database performance and adjust RDS parameters if needed
- Ensure indexes are properly created for tenant isolation queries
- Verify connection pooling settings

### Static Content Optimization

- Configure CloudFront distribution for static content
- Update application to use CloudFront URLs for static assets

## 5. Backup and Disaster Recovery

### Database Backups

Ensure automated backups are configured:

```bash
aws rds modify-db-instance \
  --db-instance-identifier YOUR_DB_INSTANCE \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-05:00"
```

### Snapshot Strategy

Create a manual snapshot after successful deployment:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier YOUR_DB_INSTANCE \
  --db-snapshot-identifier post-deploy-snapshot-$(date +%Y%m%d)
```

### Elastic Beanstalk Configuration Backup

Save your environment configuration:

```bash
aws elasticbeanstalk describe-configuration-settings \
  --environment-name Dott-env \
  --application-name Dott \
  > eb-configuration-backup-$(date +%Y%m%d).json
```

## 6. Documentation Update

### Deployment Record

Update your deployment records with:
- Version deployed
- Date and time of deployment
- Features/fixes included
- Issues encountered and resolved

### Architecture Diagram Update

Ensure architecture diagrams are updated to reflect any changes in the deployment structure.

## 7. Continuous Integration Setup

### Automated Deployment Pipeline

Set up CI/CD for future deployments:
- Configure GitHub Actions or AWS CodePipeline
- Set up automated testing
- Configure deployment approval steps

Example GitHub Actions workflow:

```yaml
name: Deploy to Elastic Beanstalk
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Generate deployment package
      run: bash ./deploy_fixed_docker_eb.sh
    - name: Deploy to EB
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
    - run: |
        aws elasticbeanstalk create-application-version \
          --application-name Dott \
          --version-label v1-$(date +%Y%m%d%H%M%S) \
          --source-bundle S3Bucket="dott-app-deployments-dockerebmanual001",S3Key="pyfactor-docker-deployment.zip"
        aws elasticbeanstalk update-environment \
          --environment-name Dott-env \
          --version-label v1-$(date +%Y%m%d%H%M%S)
```

## 8. User Acceptance Testing

### Test Plan Execution

Execute the UAT test plan with:
- Primary user journeys
- Edge cases
- Tenant isolation verification
- Performance under load

### Feedback Collection

Set up mechanisms to collect feedback from initial users.

## 9. Maintenance Schedule

### Regular Updates

Schedule regular maintenance windows for:
- OS patching
- Security updates  
- Database maintenance
- Performance tuning

Example maintenance script:

```bash
#!/bin/bash
# maintenance.sh
# Run weekly system updates while minimizing downtime

# Record start time
echo "Starting maintenance at $(date)"

# Perform database maintenance at low-traffic time
aws rds apply-pending-maintenance-action \
  --resource-identifier YOUR_DB_ARN \
  --apply-action system-update \
  --opt-in-type immediate

# Update application dependencies with minimal downtime
aws elasticbeanstalk create-application-version \
  --application-name Dott \
  --version-label maintenance-$(date +%Y%m%d) \
  --source-bundle S3Bucket="dott-app-deployments-dockerebmanual001",S3Key="maintenance-package.zip"

aws elasticbeanstalk update-environment \
  --environment-name Dott-env \
  --version-label maintenance-$(date +%Y%m%d)

echo "Maintenance completed at $(date)"
```

## 10. Load Testing

### Simulate Expected Traffic

Use load testing tools to ensure the system can handle expected traffic:

```bash
# Install k6 load testing tool
brew install k6

# Run load test (example)
k6 run --vus 100 --duration 30s load-test.js
```

Create a basic load test script (load-test.js):

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function() {
  const res = http.get('https://YOUR_EB_URL/api/health');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
```

## Next Steps Checklist

- [ ] Complete initial verification steps
- [ ] Set up monitoring and alerting
- [ ] Perform security hardening
- [ ] Configure backups and disaster recovery
- [ ] Update documentation
- [ ] Set up CI/CD for future deployments
- [ ] Complete user acceptance testing
- [ ] Schedule regular maintenance
- [ ] Perform load testing
- [ ] Plan for future enhancements

By following this post-deployment guide, you'll ensure your application is running optimally, securely, and with proper operational safeguards in place.
