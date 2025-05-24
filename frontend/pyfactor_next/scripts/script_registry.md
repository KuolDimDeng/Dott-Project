# Frontend Scripts Registry
Last Updated: 2025-05-23 18:08:15

## Purpose
This registry tracks all scripts in the frontend/pyfactor_next/scripts directory, their purpose, and execution status.

## Script Inventory

### Version0001_update_backend_url_deployment.js
- **Version**: 0001
- **Purpose**: Update frontend configuration to point to the deployed AWS Elastic Beanstalk backend URL after successful deployment
- **Status**: ✅ CREATED - READY FOR EXECUTION
- **Requirements**:
  - Next.js 15
  - No hardcoded environment keys
  - Use .env.local for configuration
  - Maintain HTTPS/SSL configuration
  - Ensure proper CORS configuration
- **Functionality**:
  - Updates .env.local with production backend URL
  - Updates API configuration files
  - Updates Next.js configuration for API proxying
  - Creates backend connection verification script
  - Creates production deployment script
- **Usage**: `node Version0001_update_backend_url_deployment.js <backend_url>`
- **Example**: `node Version0001_update_backend_url_deployment.js https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com`

## Files That Will Be Modified
- `.env.local` (backend URL configuration)
- `src/utils/api.js` (if exists)
- `next.config.js` (API rewrites)

## Files That Will Be Created
- `verify_backend_connection.js` (connection testing)
- `deploy-to-vercel-production.sh` (deployment automation)
- `FRONTEND_BACKEND_UPDATE_SUMMARY_[timestamp].md` (change summary)

## Environment Variables Set
- `NEXT_PUBLIC_API_BASE_URL` - Production backend URL
- `NEXT_PUBLIC_BACKEND_URL` - Production backend URL
- `NEXT_PUBLIC_API_URL` - Production backend URL
- `NEXT_PUBLIC_ENVIRONMENT` - Set to 'production'

## Backup Strategy
- All modified files backed up to: `frontend_file_backups/`
- Backup naming: `filename.backup-[ISO-timestamp]`
- Timestamp format: `YYYY-MM-DDTHH-mm-ss-sssZ`

## Deployment Workflow
1. **Backend Deployment**: Complete backend deployment to AWS Elastic Beanstalk first
2. **Frontend Update**: Run Version0001_update_backend_url_deployment.js with backend URL
3. **Connection Verification**: Run `node verify_backend_connection.js`
4. **Production Deployment**: Run `./deploy-to-vercel-production.sh`

## Frontend Deployment Targets
- **Production**: https://www.dottapps.com (Vercel)
- **Platform**: Next.js 15 with PNPM package manager
- **Backend Integration**: AWS Elastic Beanstalk with RDS tenant isolation

## Execution Status
- **Created**: 2025-05-23 18:07:29
- **Status**: Ready for execution after backend deployment
- **Prerequisites**: Backend must be successfully deployed and accessible

## Notes
- Script uses ES modules (not CommonJS) as per requirements
- Comprehensive documentation within script
- Version control naming convention: Version####_<description>_<target>
- Production mode only (no development mode)
- No hardcoded environment keys or sensitive information
