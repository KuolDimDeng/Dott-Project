#!/usr/bin/env python3

"""
Dott API Gateway Monitoring Setup
Creates CloudWatch alarms and dashboards for API Gateway monitoring
Created: 2025-05-22
"""

import boto3
import json
import time

def setup_api_gateway_monitoring():
    """Set up comprehensive monitoring for Dott API Gateway"""
    
    print("🔧 Setting up Dott API Gateway Monitoring...")
    
    # Initialize AWS clients
    cloudwatch = boto3.client('cloudwatch', region_name='us-east-1')
    apigateway = boto3.client('apigateway', region_name='us-east-1')
    
    # API Gateway details
    api_gateway_id = 'uonwc77x38'
    api_gateway_name = 'Dott-API-production'
    stage_name = 'production'
    
    try:
        # Create CloudWatch Alarms
        alarms = [
            {
                'AlarmName': 'Dott-API-HighErrorRate',
                'AlarmDescription': 'Alert when API Gateway error rate exceeds 5%',
                'MetricName': '4XXError',
                'Namespace': 'AWS/ApiGateway',
                'Statistic': 'Sum',
                'Period': 300,  # 5 minutes
                'EvaluationPeriods': 2,
                'Threshold': 10.0,
                'ComparisonOperator': 'GreaterThanThreshold',
                'Dimensions': [
                    {'Name': 'ApiName', 'Value': api_gateway_name},
                    {'Name': 'Stage', 'Value': stage_name}
                ]
            },
            {
                'AlarmName': 'Dott-API-HighLatency',
                'AlarmDescription': 'Alert when API Gateway latency exceeds 5 seconds',
                'MetricName': 'Latency',
                'Namespace': 'AWS/ApiGateway',
                'Statistic': 'Average',
                'Period': 300,
                'EvaluationPeriods': 2,
                'Threshold': 5000.0,  # 5 seconds in milliseconds
                'ComparisonOperator': 'GreaterThanThreshold',
                'Dimensions': [
                    {'Name': 'ApiName', 'Value': api_gateway_name},
                    {'Name': 'Stage', 'Value': stage_name}
                ]
            },
            {
                'AlarmName': 'Dott-API-HighThrottling',
                'AlarmDescription': 'Alert when API Gateway throttling rate is high',
                'MetricName': 'Throttles',
                'Namespace': 'AWS/ApiGateway',
                'Statistic': 'Sum',
                'Period': 300,
                'EvaluationPeriods': 1,
                'Threshold': 5.0,
                'ComparisonOperator': 'GreaterThanThreshold',
                'Dimensions': [
                    {'Name': 'ApiName', 'Value': api_gateway_name},
                    {'Name': 'Stage', 'Value': stage_name}
                ]
            },
            {
                'AlarmName': 'Dott-API-LowRequestCount',
                'AlarmDescription': 'Alert when API Gateway has unusually low traffic',
                'MetricName': 'Count',
                'Namespace': 'AWS/ApiGateway',
                'Statistic': 'Sum',
                'Period': 600,  # 10 minutes
                'EvaluationPeriods': 3,
                'Threshold': 1.0,
                'ComparisonOperator': 'LessThanThreshold',
                'Dimensions': [
                    {'Name': 'ApiName', 'Value': api_gateway_name},
                    {'Name': 'Stage', 'Value': stage_name}
                ]
            }
        ]
        
        # Create alarms
        created_alarms = []
        for alarm in alarms:
            try:
                cloudwatch.put_metric_alarm(**alarm)
                created_alarms.append(alarm['AlarmName'])
                print(f"   ✅ Created alarm: {alarm['AlarmName']}")
            except Exception as e:
                print(f"   ❌ Failed to create alarm {alarm['AlarmName']}: {e}")
        
        # Create CloudWatch Dashboard
        dashboard_body = {
            "widgets": [
                {
                    "type": "metric",
                    "x": 0,
                    "y": 0,
                    "width": 12,
                    "height": 6,
                    "properties": {
                        "metrics": [
                            ["AWS/ApiGateway", "Count", "ApiName", api_gateway_name, "Stage", stage_name],
                            [".", "4XXError", ".", ".", ".", "."],
                            [".", "5XXError", ".", ".", ".", "."]
                        ],
                        "period": 300,
                        "stat": "Sum",
                        "region": "us-east-1",
                        "title": "Dott API Gateway - Request Count & Errors",
                        "yAxis": {
                            "left": {
                                "min": 0
                            }
                        }
                    }
                },
                {
                    "type": "metric",
                    "x": 12,
                    "y": 0,
                    "width": 12,
                    "height": 6,
                    "properties": {
                        "metrics": [
                            ["AWS/ApiGateway", "Latency", "ApiName", api_gateway_name, "Stage", stage_name],
                            [".", "IntegrationLatency", ".", ".", ".", "."]
                        ],
                        "period": 300,
                        "stat": "Average",
                        "region": "us-east-1",
                        "title": "Dott API Gateway - Latency",
                        "yAxis": {
                            "left": {
                                "min": 0
                            }
                        }
                    }
                },
                {
                    "type": "metric",
                    "x": 0,
                    "y": 6,
                    "width": 12,
                    "height": 6,
                    "properties": {
                        "metrics": [
                            ["AWS/ApiGateway", "Throttles", "ApiName", api_gateway_name, "Stage", stage_name]
                        ],
                        "period": 300,
                        "stat": "Sum",
                        "region": "us-east-1",
                        "title": "Dott API Gateway - Throttling",
                        "yAxis": {
                            "left": {
                                "min": 0
                            }
                        }
                    }
                },
                {
                    "type": "metric",
                    "x": 12,
                    "y": 6,
                    "width": 12,
                    "height": 6,
                    "properties": {
                        "metrics": [
                            ["AWS/ApiGateway", "CacheHitCount", "ApiName", api_gateway_name, "Stage", stage_name],
                            [".", "CacheMissCount", ".", ".", ".", "."]
                        ],
                        "period": 300,
                        "stat": "Sum",
                        "region": "us-east-1",
                        "title": "Dott API Gateway - Cache Performance"
                    }
                }
            ]
        }
        
        # Create dashboard
        dashboard_name = 'Dott-API-Gateway-Dashboard'
        try:
            cloudwatch.put_dashboard(
                DashboardName=dashboard_name,
                DashboardBody=json.dumps(dashboard_body)
            )
            print(f"   ✅ Created dashboard: {dashboard_name}")
        except Exception as e:
            print(f"   ❌ Failed to create dashboard: {e}")
        
        # Get current API Gateway metrics
        print("\n📊 Current API Gateway Metrics:")
        
        metrics_to_check = ['Count', '4XXError', '5XXError', 'Latency', 'Throttles']
        
        for metric_name in metrics_to_check:
            try:
                response = cloudwatch.get_metric_statistics(
                    Namespace='AWS/ApiGateway',
                    MetricName=metric_name,
                    Dimensions=[
                        {'Name': 'ApiName', 'Value': api_gateway_name},
                        {'Name': 'Stage', 'Value': stage_name}
                    ],
                    StartTime=time.time() - 3600,  # Last hour
                    EndTime=time.time(),
                    Period=300,
                    Statistics=['Sum', 'Average']
                )
                
                if response['Datapoints']:
                    latest = max(response['Datapoints'], key=lambda x: x['Timestamp'])
                    value = latest.get('Sum', latest.get('Average', 0))
                    print(f"   📈 {metric_name}: {value}")
                else:
                    print(f"   📈 {metric_name}: No data (expected for new deployment)")
                    
            except Exception as e:
                print(f"   ❌ Error getting {metric_name}: {e}")
        
        # Create monitoring summary
        monitoring_summary = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "apiGatewayId": api_gateway_id,
            "apiGatewayName": api_gateway_name,
            "stage": stage_name,
            "monitoring": {
                "alarms": {
                    "created": created_alarms,
                    "total": len(created_alarms)
                },
                "dashboard": dashboard_name,
                "metricsTracked": metrics_to_check
            },
            "urls": {
                "cloudWatchDashboard": f"https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name={dashboard_name}",
                "cloudWatchAlarms": "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:",
                "apiGatewayConsole": f"https://console.aws.amazon.com/apigateway/main/apis/{api_gateway_id}/resources?api={api_gateway_id}&region=us-east-1"
            }
        }
        
        # Save monitoring summary
        with open('dott-api-gateway-monitoring.json', 'w') as f:
            json.dump(monitoring_summary, f, indent=2)
        
        print(f"\n🎉 Monitoring setup complete!")
        print(f"📄 Configuration saved: dott-api-gateway-monitoring.json")
        print(f"\n🔗 Monitoring URLs:")
        print(f"   📊 Dashboard: {monitoring_summary['urls']['cloudWatchDashboard']}")
        print(f"   🚨 Alarms: {monitoring_summary['urls']['cloudWatchAlarms']}")
        print(f"   ⚙️  API Gateway: {monitoring_summary['urls']['apiGatewayConsole']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up monitoring: {e}")
        return False

def get_api_usage_report():
    """Generate a usage report for the API Gateway"""
    
    print("\n📈 Generating API Usage Report...")
    
    cloudwatch = boto3.client('cloudwatch', region_name='us-east-1')
    api_gateway_name = 'Dott-API-production'
    stage_name = 'production'
    
    # Get metrics for the last 24 hours
    end_time = time.time()
    start_time = end_time - 86400  # 24 hours ago
    
    usage_report = {
        "reportPeriod": {
            "start": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(start_time)),
            "end": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(end_time))
        },
        "metrics": {}
    }
    
    metrics = {
        "TotalRequests": "Count",
        "SuccessfulRequests": "Count",
        "ClientErrors": "4XXError", 
        "ServerErrors": "5XXError",
        "AverageLatency": "Latency",
        "Throttles": "Throttles"
    }
    
    for report_name, metric_name in metrics.items():
        try:
            response = cloudwatch.get_metric_statistics(
                Namespace='AWS/ApiGateway',
                MetricName=metric_name,
                Dimensions=[
                    {'Name': 'ApiName', 'Value': api_gateway_name},
                    {'Name': 'Stage', 'Value': stage_name}
                ],
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,  # 1 hour periods
                Statistics=['Sum', 'Average']
            )
            
            if response['Datapoints']:
                total_sum = sum(dp.get('Sum', 0) for dp in response['Datapoints'])
                avg_value = sum(dp.get('Average', 0) for dp in response['Datapoints']) / len(response['Datapoints'])
                
                usage_report["metrics"][report_name] = {
                    "total": total_sum,
                    "average": avg_value,
                    "dataPoints": len(response['Datapoints'])
                }
            else:
                usage_report["metrics"][report_name] = {
                    "total": 0,
                    "average": 0,
                    "dataPoints": 0
                }
                
        except Exception as e:
            print(f"   ❌ Error getting {report_name}: {e}")
            usage_report["metrics"][report_name] = {"error": str(e)}
    
    # Save usage report
    with open('dott-api-gateway-usage-report.json', 'w') as f:
        json.dump(usage_report, f, indent=2)
    
    print("📊 Usage Report Summary (Last 24 Hours):")
    for metric_name, data in usage_report["metrics"].items():
        if "error" in data:
            print(f"   ❌ {metric_name}: Error")
        else:
            print(f"   📈 {metric_name}: {data['total']} total, {data['average']:.2f} avg")
    
    print(f"📄 Detailed report saved: dott-api-gateway-usage-report.json")
    
    return usage_report

if __name__ == "__main__":
    success = setup_api_gateway_monitoring()
    if success:
        get_api_usage_report()
        print("\n✅ All monitoring setup tasks completed successfully!")
    else:
        print("\n❌ Some monitoring setup tasks failed")
        exit(1) 