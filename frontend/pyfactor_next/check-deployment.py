#!/usr/bin/env python3

import boto3
import json
import time
import sys

def main():
    print("🔍 Checking Dott API Gateway Deployment Status...")
    
    # Initialize CloudFormation client
    cf = boto3.client('cloudformation', region_name='us-east-1')
    
    try:
        # Check test stack
        print("\n📋 Checking test stack...")
        test_response = cf.describe_stacks(StackName='dott-api-gateway-test')
        test_status = test_response['Stacks'][0]['StackStatus']
        print(f"   Test Stack Status: {test_status}")
        
        if test_status == 'CREATE_COMPLETE':
            print("✅ Test stack created successfully!")
            
            # Get test API Gateway URL
            outputs = test_response['Stacks'][0].get('Outputs', [])
            for output in outputs:
                if output['OutputKey'] == 'APIGatewayURL':
                    test_url = output['OutputValue']
                    print(f"   Test API URL: {test_url}")
                    
            # Clean up test stack
            print("🧹 Cleaning up test stack...")
            cf.delete_stack(StackName='dott-api-gateway-test')
            print("   Test stack deletion initiated")
            
        elif test_status in ['ROLLBACK_COMPLETE', 'CREATE_FAILED']:
            print("❌ Test stack failed")
            # Get failure reason
            events = cf.describe_stack_events(StackName='dott-api-gateway-test')
            for event in events['StackEvents'][:5]:
                if event.get('ResourceStatusReason'):
                    print(f"   Error: {event['ResourceStatusReason']}")
            return False
            
    except cf.exceptions.ClientError as e:
        if 'does not exist' in str(e):
            print("   Test stack not found")
        else:
            print(f"   Error checking test stack: {e}")
    
    # Deploy production stack
    print("\n🚀 Deploying production API Gateway...")
    
    # Clean up any existing production stack
    try:
        cf.delete_stack(StackName='dott-api-gateway')
        print("   Cleaning up existing production stack...")
        time.sleep(30)
    except:
        pass
    
    # Read template
    with open('infrastructure/api-gateway.yml', 'r') as f:
        template = f.read()
    
    # Create production stack
    try:
        response = cf.create_stack(
            StackName='dott-api-gateway',
            TemplateBody=template,
            Parameters=[
                {'ParameterKey': 'CognitoUserPoolId', 'ParameterValue': 'us-east-1_JPL8vGfb6'},
                {'ParameterKey': 'DjangoBackendUrl', 'ParameterValue': 'https://api.dottapps.com'},
                {'ParameterKey': 'NextJSApiUrl', 'ParameterValue': 'https://frontend.dottapps.com'},
                {'ParameterKey': 'Environment', 'ParameterValue': 'production'}
            ],
            Capabilities=['CAPABILITY_IAM'],
            Tags=[
                {'Key': 'Application', 'Value': 'Dott'},
                {'Key': 'Environment', 'Value': 'production'},
                {'Key': 'ManagedBy', 'Value': 'CloudFormation'}
            ]
        )
        
        stack_id = response['StackId']
        print(f"✅ Production stack creation initiated: {stack_id}")
        
        # Wait for completion
        print("⏳ Waiting for stack creation to complete (5-10 minutes)...")
        waiter = cf.get_waiter('stack_create_complete')
        
        try:
            waiter.wait(
                StackName='dott-api-gateway',
                WaiterConfig={'Delay': 30, 'MaxAttempts': 40}
            )
            
            # Get outputs
            response = cf.describe_stacks(StackName='dott-api-gateway')
            stack = response['Stacks'][0]
            
            if stack['StackStatus'] == 'CREATE_COMPLETE':
                print("🎉 Dott API Gateway deployed successfully!")
                
                outputs = stack.get('Outputs', [])
                api_url = None
                api_id = None
                
                for output in outputs:
                    if output['OutputKey'] == 'APIGatewayURL':
                        api_url = output['OutputValue']
                    elif output['OutputKey'] == 'APIGatewayId':
                        api_id = output['OutputValue']
                
                print(f"\n🌐 API Gateway Information:")
                print(f"   API Gateway URL: {api_url}")
                print(f"   API Gateway ID: {api_id}")
                
                print(f"\n🔗 Available Endpoints:")
                print(f"   Payroll Reports:    {api_url}/payroll/reports")
                print(f"   Payroll Run:        {api_url}/payroll/run")
                print(f"   Payroll Export:     {api_url}/payroll/export-report")
                print(f"   Payroll Settings:   {api_url}/payroll/settings")
                print(f"   Business APIs:      {api_url}/business/*")
                print(f"   Onboarding APIs:    {api_url}/onboarding/*")
                
                # Save deployment info
                deployment_info = {
                    "apiGatewayUrl": api_url,
                    "apiGatewayId": api_id,
                    "deploymentTime": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                    "environment": "production",
                    "status": "success"
                }
                
                with open('dott-api-gateway-deployment.json', 'w') as f:
                    json.dump(deployment_info, f, indent=2)
                
                print(f"\n📄 Deployment info saved to: dott-api-gateway-deployment.json")
                print(f"\n🔧 Next Steps:")
                print(f"   1. Update frontend config: ./update-api-config.sh \"{api_url}\" production")
                print(f"   2. Test endpoints with Cognito tokens")
                print(f"   3. Monitor usage in CloudWatch")
                
                return True
                
        except Exception as e:
            print(f"❌ Stack creation failed: {e}")
            
            # Get failure details
            events = cf.describe_stack_events(StackName='dott-api-gateway')
            print("\n🔍 Recent stack events:")
            for event in events['StackEvents'][:10]:
                if 'FAILED' in event.get('ResourceStatus', ''):
                    print(f"   {event['LogicalResourceId']}: {event.get('ResourceStatusReason', 'Unknown error')}")
                    
            return False
            
    except Exception as e:
        print(f"❌ Failed to create stack: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 