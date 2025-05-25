/**
 * Network diagnostic utility for AWS Cognito connectivity
 */

export class CognitoNetworkDiagnostic {
  static async runFullDiagnostic() {
    const results = {
      timestamp: new Date().toISOString(),
      connectivity: {},
      dns: {},
      cors: {},
      performance: {},
      recommendations: []
    };
    
    console.log('[CognitoNetworkDiagnostic] Running full network diagnostic...');
    
    // Test basic connectivity
    try {
      const startTime = performance.now();
      const response = await fetch('https://cognito-idp.us-east-1.amazonaws.com/', { method: 'GET' });
      const endTime = performance.now();
      
      results.connectivity.cognitoIdp = {
        status: 'reachable',
        responseTime: Math.round(endTime - startTime),
        httpStatus: response.status
      };
    } catch (error) {
      results.connectivity.cognitoIdp = {
        status: 'unreachable',
        error: error.message
      };
      results.recommendations.push('Check internet connectivity to AWS Cognito services');
    }
    
    // Test DNS resolution
    try {
      const dnsStart = performance.now();
      await fetch('https://1.1.1.1/dns-query?name=cognito-idp.us-east-1.amazonaws.com&type=A', {
        headers: { 'Accept': 'application/dns-json' }
      });
      const dnsEnd = performance.now();
      
      results.dns.cloudflare = {
        status: 'working',
        responseTime: Math.round(dnsEnd - dnsStart)
      };
    } catch (error) {
      results.dns.cloudflare = {
        status: 'failed',
        error: error.message
      };
      results.recommendations.push('DNS resolution issues detected - try changing DNS servers');
    }
    
    // Test CORS preflight
    try {
      await fetch('https://cognito-idp.us-east-1.amazonaws.com/', {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'X-Amz-Target,Content-Type'
        }
      });
      
      results.cors.preflight = { status: 'allowed' };
    } catch (error) {
      results.cors.preflight = {
        status: 'blocked',
        error: error.message
      };
      
      if (error.message.includes('CORS')) {
        results.recommendations.push('CORS policy issue detected - this may affect authentication');
      }
    }
    
    // Performance benchmarks
    const performanceTests = [
      { name: 'Small Request', size: 100 },
      { name: 'Medium Request', size: 1000 },
      { name: 'Large Request', size: 10000 }
    ];
    
    for (const test of performanceTests) {
      try {
        const testData = 'x'.repeat(test.size);
        const startTime = performance.now();
        
        await fetch('https://httpbin.org/post', {
          method: 'POST',
          body: testData,
          headers: { 'Content-Type': 'text/plain' }
        });
        
        const endTime = performance.now();
        results.performance[test.name] = {
          responseTime: Math.round(endTime - startTime),
          dataSize: test.size
        };
      } catch (error) {
        results.performance[test.name] = {
          error: error.message,
          dataSize: test.size
        };
      }
    }
    
    // Generate recommendations
    if (results.connectivity.cognitoIdp?.responseTime > 5000) {
      results.recommendations.push('Slow connectivity detected - consider network optimization');
    }
    
    if (results.performance['Large Request']?.responseTime > 10000) {
      results.recommendations.push('Large request performance issues detected');
    }
    
    console.log('[CognitoNetworkDiagnostic] Diagnostic complete:', results);
    return results;
  }
  
  static async quickConnectivityTest() {
    try {
      const response = await Promise.race([
        fetch('https://cognito-idp.us-east-1.amazonaws.com/'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
      
      return {
        status: 'success',
        httpStatus: response.status,
        message: 'AWS Cognito is reachable'
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        message: 'Cannot reach AWS Cognito - check network connectivity'
      };
    }
  }
}

// Auto-run quick test in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  CognitoNetworkDiagnostic.quickConnectivityTest().then(result => {
    console.log('[CognitoNetworkDiagnostic] Quick test result:', result);
  });
}
