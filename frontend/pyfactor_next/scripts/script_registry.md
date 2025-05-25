# Frontend Scripts Registry
Last Updated: 2025-05-23 18:08:15

## Purpose
This registry tracks all scripts in the frontend/pyfactor_next/scripts directory, their purpose, and execution status.

## Script Inventory

### Version0001_update_backend_url_deployment.js
- **Version**: 0001
- **Purpose**: Update frontend configuration to point to the deployed AWS Elastic Beanstalk backend URL after successful deployment
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Execution Date**: 2025-05-24T00:10:29.066Z

### Version0002_fix_backend_connectivity_deployment.js
- **Version**: 0002
- **Purpose**: Fix backend connectivity issues and create diagnostic tools
- **Status**: ✅ EXECUTED SUCCESSFULLY
- **Execution Date**: 2025-05-24T00:41:19.355Z
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

### Version0003_pnpm_everywhere_deploy_fix.mjs
- **Version**: 0003
- **Purpose**: Configure and deploy frontend with PNPM everywhere
- **Status**: ✅ PNPM CONFIGURATION SUCCESSFUL (Vercel deployment requires manual fix)
- **Execution Date**: 2025-05-25T14:12:03.950Z
- **Description**: Fixes package manager conflicts and ensures PNPM is used consistently
- **Changes Made**:
  - ✅ Removed npm lock file conflicts
  - ✅ Configured Vercel for pnpm (vercel.json created)
  - ✅ Updated build and deploy commands
  - ✅ Cleared npm cache conflicts
  - ✅ Installed pnpm globally (version 8.10.0)
  - ✅ Refreshed dependencies with pnpm
  - ✅ Tested local build with pnpm (BUILD SUCCESSFUL)
  - ⚠️ Vercel deployment requires project settings fix
- **Manual Fix Required**: Vercel project settings need to be updated via dashboard

## Files That Will Be Modified
- `.env.local`