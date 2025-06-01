# AWS Cleanup Plan - After Successful Render Migration

## ⚠️ IMPORTANT: Only execute after confirming Render migration is successful!

### 1. **Backup AWS RDS Data (Optional)**
```bash
# Create final backup before deletion
aws rds create-db-snapshot \
    --db-instance-identifier dott-dev \
    --db-snapshot-identifier dott-dev-final-backup-$(date +%Y%m%d)
```

### 2. **Delete AWS RDS Instance**
```bash
# Delete RDS instance (this will permanently delete your AWS database)
aws rds delete-db-instance \
    --db-instance-identifier dott-dev \
    --skip-final-snapshot \
    --delete-automated-backups
```

### 3. **Clean Up Related AWS Resources**
- **RDS Subnet Groups**: Delete if not used by other instances
- **RDS Parameter Groups**: Delete custom parameter groups
- **Security Groups**: Remove RDS-specific security groups
- **VPC Resources**: Clean up if dedicated to this project

### 4. **Update DNS/Domain Settings**
- Update any DNS records pointing to AWS resources
- Update API endpoints in your applications
- Update monitoring/logging configurations

### 5. **Cost Verification**
- Monitor AWS billing to ensure all resources are stopped
- Check for any remaining charges
- Cancel any AWS support plans if no longer needed

## 💰 Expected Cost Savings
- **RDS Instance**: ~$20-50/month (depending on instance type)
- **Data Transfer**: Variable
- **Backup Storage**: ~$0.095/GB/month

## 🔄 Rollback Plan (Emergency)
If you need to rollback to AWS:
1. Restore from RDS snapshot
2. Update environment variables back to AWS settings
3. Redeploy application with AWS configuration 