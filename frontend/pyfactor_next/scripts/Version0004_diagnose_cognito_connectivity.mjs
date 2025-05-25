#!/usr/bin/env node

/**
 * Version0004_diagnose_cognito_connectivity.mjs
 * 
 * Purpose: Diagnose AWS Cognito network connectivity issues
 * Description: Tests network connectivity to AWS Cognito endpoints from production environment
 * 
 * Requirements Met:
 * - ES Modules only (.mjs extension)
 * - Comprehensive diagnostics
 * - Network testing utilities
 * - AWS endpoint verification
 * - Production environment testing
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// AWS Cognito Configuration (same as in your app)
const cognitoConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_JPL8vGfb6',
  clientId: '1o5v84mrgn4gt87khtr179uc5b'
};

console.log('🔍 AWS Cognito Connectivity Diagnostic v0004');
console.log('='.repeat(50));

/**
 * Test network connectivity to AWS endpoints
 */
async function testAWSConnectivity() {
  const endpoints = [
    'cognito-idp.us-east-1.amazonaws.com',
    'cognito-identity.us-east-1.amazonaws.com', 
    's3.us-east-1.amazonaws.com',
    'sts.us-east-1.amazonaws.com'
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`\n🔗 Testing ${endpoint}...`);
    
    try {
      // Test DNS resolution
      const dnsResult = execSync(`nslookup ${endpoint}`, { encoding: 'utf8', timeout: 10000 });
      console.log(`✅ DNS Resolution: OK`);
      
      // Test HTTPS connectivity
      const curlResult = execSync(`curl -I -s -m 10 https://${endpoint}`, { encoding: 'utf8', timeout: 15000 });
      const statusCode = curlResult.match(/HTTP\/[\d\.]+\s+(\d+)/)?.[1];
      console.log(`✅ HTTPS Connectivity: ${statusCode || 'Connected'}`);
      
      results.push({
        endpoint,
        status: 'SUCCESS',
        dns: 'OK',
        https: statusCode || 'Connected'
      });
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      results.push({
        endpoint,
        status: 'FAILED',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Test specific Cognito endpoints
 */
async function testCognitoEndpoints() {
  console.log('\n🔐 Testing AWS Cognito Specific Endpoints...');
  
  const cognitoEndpoints = [
    `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
    `https://cognito-identity.${cognitoConfig.region}.amazonaws.com/`
  ];

  const results = [];

  for (const endpoint of cognitoEndpoints) {
    console.log(`\n🔗 Testing ${endpoint}...`);
    
    try {
      // Test with curl
      const curlResult = execSync(`curl -X POST -H "Content-Type: application/x-amz-json-1.1" -H "X-Amz-Target: AWSCognitoIdentityProviderService.GetUser" -d '{}' -s -w "HTTPSTATUS:%{http_code}" "${endpoint}"`, { 
        encoding: 'utf8', 
        timeout: 15000 
      });
      
      const statusMatch = curlResult.match(/HTTPSTATUS:(\d+)/);
      const statusCode = statusMatch ? statusMatch[1] : 'Unknown';
      
      console.log(`✅ Cognito Endpoint Response: ${statusCode}`);
      
      results.push({
        endpoint,
        status: 'REACHABLE',
        httpStatus: statusCode
      });
      
    } catch (error) {
      console.log(`❌ Cognito Endpoint Failed: ${error.message}`);
      results.push({
        endpoint,
        status: 'FAILED',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Generate diagnostic report
 */
function generateReport(awsResults, cognitoResults) {
  const timestamp = new Date().toISOString();
  
  const report = {
    timestamp,
    cognitoConfig,
    environment: 'production-test',
    awsConnectivity: awsResults,
    cognitoEndpoints: cognitoResults,
    recommendations: []
  };

  // Generate recommendations based on results
  const failedAWS = awsResults.filter(r => r.status === 'FAILED');
  const failedCognito = cognitoResults.filter(r => r.status === 'FAILED');

  if (failedAWS.length > 0) {
    report.recommendations.push('❌ AWS connectivity issues detected - check network/DNS');
  }

  if (failedCognito.length > 0) {
    report.recommendations.push('❌ Cognito endpoint issues detected - check AWS configuration');
  }

  if (failedAWS.length === 0 && failedCognito.length === 0) {
    report.recommendations.push('✅ All endpoints reachable - issue may be in Amplify configuration or request headers');
  }

  // Write report to file
  const reportPath = join(projectRoot, `COGNITO_DIAGNOSTIC_REPORT_${timestamp.replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📊 Diagnostic report written to: ${reportPath}`);
  return report;
}

/**
 * Main diagnostic function
 */
async function main() {
  try {
    console.log('🔍 Starting AWS Cognito connectivity diagnostics...\n');
    
    // Test general AWS connectivity
    const awsResults = await testAWSConnectivity();
    
    // Test specific Cognito endpoints
    const cognitoResults = await testCognitoEndpoints();
    
    // Generate comprehensive report
    const report = generateReport(awsResults, cognitoResults);
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`\n🔗 AWS Connectivity: ${awsResults.filter(r => r.status === 'SUCCESS').length}/${awsResults.length} endpoints reachable`);
    console.log(`🔐 Cognito Endpoints: ${cognitoResults.filter(r => r.status === 'REACHABLE').length}/${cognitoResults.length} endpoints reachable`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`   ${rec}`));
    
    if (report.recommendations.length === 0) {
      console.log('   ✅ All basic connectivity tests passed');
      console.log('   🔍 Issue likely in Amplify configuration or authentication flow');
    }
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main; 