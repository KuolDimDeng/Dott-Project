/**
 * Version0043_post_deployment_verify.js
 * 
 * Purpose:
 * This script performs post-deployment verification tasks to ensure the application
 * is running correctly on AWS Elastic Beanstalk. It checks environment health,
 * retrieves the application URL, analyzes recent logs for errors, and helps set up
 * basic monitoring.
 * 
 * Created: 2025-05-18
 * Author: Automated Deployment Tools
 * 
 * Usage:
 * node Version0043_post_deployment_verify.js [--env-name ENV_NAME]
 * 
 * Options:
 * --env-name: The Elastic Beanstalk environment name (default: "Dott-env")
 * 
 * Execution Status:
 * Not executed - Run this script after successful deployment
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = __dirname;
const projectRoot = path.resolve(__dirname, '../../..');
const registryPath = path.join(scriptsDir, 'scripts_registry.json');

// Environment configuration
const defaultEnvName = 'Dott-env';
const appName = 'Dott';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { envName: defaultEnvName };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env-name' && i + 1 < args.length) {
      options.envName = args[i + 1];
      i++;
    }
  }
  
  return options;
}

/**
 * Execute a shell command and return the output
 * @param {string} command - Command to execute
 * @returns {string} Command output
 */
function executeCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    console.error(`${colors.red}Error executing command:${colors.reset} ${command}`);
    console.error(error.message);
    return null;
  }
}

/**
 * Check Elastic Beanstalk environment health
 * @param {string} envName - Environment name
 * @returns {Object} Environment status and health
 */
async function checkEnvironmentHealth(envName) {
  console.log(`\n${colors.cyan}Checking environment health for ${envName}...${colors.reset}`);
  
  const command = `aws elasticbeanstalk describe-environments --environment-names ${envName} --query "Environments[0].{Status:Status,Health:Health,VersionLabel:VersionLabel}" --output json`;
  const output = executeCommand(command);
  
  if (!output) {
    return { status: 'Unknown', health: 'Unknown', version: 'Unknown' };
  }
  
  const envInfo = JSON.parse(output);
  
  // Display the results
  console.log(`${colors.blue}Environment Status:${colors.reset} ${envInfo.Status}`);
  
  if (envInfo.Health === 'Green') {
    console.log(`${colors.blue}Environment Health:${colors.reset} ${colors.green}${envInfo.Health}${colors.reset}`);
  } else if (envInfo.Health === 'Yellow') {
    console.log(`${colors.blue}Environment Health:${colors.reset} ${colors.yellow}${envInfo.Health}${colors.reset}`);
  } else {
    console.log(`${colors.blue}Environment Health:${colors.reset} ${colors.red}${envInfo.Health}${colors.reset}`);
  }
  
  console.log(`${colors.blue}Version Label:${colors.reset} ${envInfo.VersionLabel}`);
  
  return { 
    status: envInfo.Status, 
    health: envInfo.Health,
    version: envInfo.VersionLabel
  };
}

/**
 * Get the application URL
 * @param {string} envName - Environment name
 * @returns {string} Application URL
 */
async function getApplicationUrl(envName) {
  console.log(`\n${colors.cyan}Retrieving application URL for ${envName}...${colors.reset}`);
  
  const command = `aws elasticbeanstalk describe-environments --environment-names ${envName} --query "Environments[0].CNAME" --output text`;
  const url = executeCommand(command);
  
  if (!url) {
    return null;
  }
  
  console.log(`${colors.blue}Application URL:${colors.reset} http://${url.trim()}`);
  console.log(`${colors.yellow}Action needed:${colors.reset} Open this URL in your browser to verify your application loads properly.`);
  
  return url.trim();
}

/**
 * Check recent logs for errors or warnings
 * @param {string} envName - Environment name
 * @returns {Object} Log analysis results
 */
async function checkRecentLogs(envName) {
  console.log(`\n${colors.cyan}Analyzing recent logs for ${envName}...${colors.reset}`);
  
  // Use the aws_eb_logs.sh script with filter for errors and warnings
  const command = `cd ${scriptsDir} && bash ./aws_eb_logs.sh --env-name ${envName} --recent --filter "ERROR|WARNING"`;
  console.log(`${colors.yellow}Executing:${colors.reset} ${command}`);
  console.log(`${colors.yellow}This may take a moment...${colors.reset}`);
  
  console.log(`\n${colors.yellow}Important:${colors.reset} Review these logs carefully for any issues.`);
  console.log(`For real-time log tailing, you can run:`);
  console.log(`cd ${scriptsDir} && ./aws_eb_logs.sh --env-name ${envName} --tail`);
  
  return { command };
}

/**
 * Generate CloudWatch monitoring commands
 * @param {string} envName - Environment name
 * @returns {string} CloudWatch setup commands
 */
async function generateMonitoringCommands(envName) {
  console.log(`\n${colors.cyan}Generating CloudWatch monitoring setup commands...${colors.reset}`);
  
  const monitoringCommands = `
# Create CloudWatch Alarm for High CPU
aws cloudwatch put-metric-alarm \\
  --alarm-name ${envName}-HighCPU \\
  --comparison-operator GreaterThanThreshold \\
  --evaluation-periods 2 \\
  --metric-name CPUUtilization \\
  --namespace AWS/EC2 \\
  --period 300 \\
  --statistic Average \\
  --threshold 80 \\
  --alarm-description "Alarm when CPU exceeds 80%" \\
  --dimensions "Name=AutoScalingGroupName,Value=YOUR_ASG_NAME" \\
  --alarm-actions "YOUR_SNS_TOPIC_ARN"

# Create CloudWatch Log Metric Filter for Errors
aws logs put-metric-filter \\
  --log-group-name /aws/elasticbeanstalk/${envName} \\
  --filter-name ErrorCount \\
  --filter-pattern "ERROR" \\
  --metric-transformations metricName=ErrorCount,metricNamespace=DottApp/Errors,metricValue=1,defaultValue=0
  `;
  
  // Save the monitoring commands to a file
  const monitoringScriptPath = path.join(scriptsDir, 'setup_monitoring.sh');
  await fs.writeFile(monitoringScriptPath, `#!/bin/bash\n${monitoringCommands}`);
  await fs.chmod(monitoringScriptPath, '755');
  
  console.log(`${colors.green}Created monitoring setup script:${colors.reset} ${monitoringScriptPath}`);
  console.log(`${colors.yellow}Action needed:${colors.reset} Edit the script to add your AutoScaling Group name and SNS Topic ARN, then run it.`);
  
  return monitoringScriptPath;
}

/**
 * Create a post-deployment verification report
 * @param {string} envName - Environment name
 * @param {Object} healthInfo - Environment health info
 * @param {string} appUrl - Application URL
 */
async function createVerificationReport(envName, healthInfo, appUrl) {
  console.log(`\n${colors.cyan}Creating post-deployment verification report...${colors.reset}`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(projectRoot, 'backend', 'pyfactor', `DEPLOYMENT_VERIFICATION_${timestamp}.md`);
  
  const reportContent = `# Deployment Verification Report

## Environment Information
- **Environment Name:** ${envName}
- **Application Name:** ${appName}
- **Verification Date:** ${new Date().toLocaleString()}
- **Verified By:** ${process.env.USER || 'Deployment System'}

## Health Check
- **Environment Status:** ${healthInfo.status}
- **Environment Health:** ${healthInfo.health}
- **Version Deployed:** ${healthInfo.version}

## Access Information
- **Application URL:** http://${appUrl}

## Verification Steps
- [ ] Verified environment health is Green
- [ ] Confirmed application loads properly at URL
- [ ] Reviewed logs for errors and warnings
- [ ] Tested authentication flow
- [ ] Verified tenant isolation (RLS) is working
- [ ] Checked API endpoints for proper responses
- [ ] Set up CloudWatch alarms and metric filters
- [ ] Verified database connections

## Next Steps
1. Complete the verification checklist above
2. Set up monitoring and alerting
3. Perform security hardening
4. Configure backups and disaster recovery
5. Update documentation
6. Set up CI/CD for future deployments

For detailed post-deployment steps, see [Post-Deployment Guide](/Users/kuoldeng/projectx/backend/pyfactor/POST_DEPLOYMENT_GUIDE.md).
`;

  await fs.writeFile(reportPath, reportContent);
  console.log(`${colors.green}Created verification report:${colors.reset} ${reportPath}`);
  
  return reportPath;
}

/**
 * Update the scripts registry
 */
async function updateScriptRegistry() {
  try {
    let registry = {};
    
    try {
      const registryContent = await fs.readFile(registryPath, 'utf8');
      registry = JSON.parse(registryContent);
    } catch (err) {
      // If the file doesn't exist or is invalid, create a new registry
      registry = { 
        scripts: [],
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Add this script to the registry
    registry.scripts.push({
      name: 'Version0043_post_deployment_verify.js',
      purpose: 'Performs post-deployment verification tasks for AWS Elastic Beanstalk applications',
      created: new Date().toISOString(),
      status: 'Available',
      lastExecuted: null
    });
    
    registry.lastUpdated = new Date().toISOString();
    
    // Write the updated registry back to the file
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
    console.log(`\n${colors.green}Updated script registry.${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error updating script registry:${colors.reset}`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`\n${colors.yellow}====================================================${colors.reset}`);
    console.log(`${colors.yellow}Post-Deployment Verification Tool${colors.reset}`);
    console.log(`${colors.yellow}====================================================${colors.reset}\n`);
    
    const options = parseArgs();
    console.log(`${colors.blue}Environment:${colors.reset} ${options.envName}\n`);
    
    // Step 1: Check environment health
    const healthInfo = await checkEnvironmentHealth(options.envName);
    
    // Step 2: Get application URL
    const appUrl = await getApplicationUrl(options.envName);
    
    // Step 3: Check recent logs
    const logInfo = await checkRecentLogs(options.envName);
    
    // Step 4: Generate monitoring commands
    const monitoringScript = await generateMonitoringCommands(options.envName);
    
    // Step 5: Create verification report
    const reportPath = await createVerificationReport(options.envName, healthInfo, appUrl);
    
    // Step 6: Update script registry
    await updateScriptRegistry();
    
    console.log(`\n${colors.yellow}====================================================${colors.reset}`);
    console.log(`${colors.green}Post-Deployment Verification Complete${colors.reset}`);
    console.log(`${colors.yellow}====================================================${colors.reset}`);
    console.log(`\n${colors.blue}Generated Files:${colors.reset}`);
    console.log(`1. ${monitoringScript}`);
    console.log(`2. ${reportPath}`);
    
    console.log(`\n${colors.yellow}Next Steps:${colors.reset}`);
    console.log(`1. Review the verification report and complete the checklist`);
    console.log(`2. Configure the monitoring script with your specific parameters`);
    console.log(`3. Follow the complete post-deployment guide for additional steps:\n   ${path.join(projectRoot, 'backend', 'pyfactor', 'POST_DEPLOYMENT_GUIDE.md')}`);
    
  } catch (error) {
    console.error(`${colors.red}Error in post-deployment verification:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Execute the main function
main();
