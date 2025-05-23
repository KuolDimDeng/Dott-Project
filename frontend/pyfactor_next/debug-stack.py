#!/usr/bin/env python3

import boto3

def debug_stack():
    cf = boto3.client('cloudformation', region_name='us-east-1')
    
    try:
        events = cf.describe_stack_events(StackName='dott-api-gateway')
        print('🔍 CloudFormation Stack Failure Analysis:')
        print('=' * 60)
        
        failure_events = []
        for event in events['StackEvents']:
            status = event.get('ResourceStatus', '')
            if 'FAILED' in status or event.get('ResourceStatusReason'):
                failure_events.append(event)
        
        # Show most recent failures first
        for event in failure_events[:10]:
            print(f"Resource: {event['LogicalResourceId']}")
            print(f"Status: {event.get('ResourceStatus', 'N/A')}")
            print(f"Reason: {event.get('ResourceStatusReason', 'N/A')}")
            print(f"Type: {event.get('ResourceType', 'N/A')}")
            print(f"Time: {event.get('Timestamp', 'N/A')}")
            print('-' * 40)
            
    except Exception as e:
        print(f"Error getting stack events: {e}")

if __name__ == "__main__":
    debug_stack() 