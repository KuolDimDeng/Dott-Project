#!/bin/bash
echo "🚀 Emergency scale up for traffic spike..."
eb scale 3
eb setenv EB_INSTANCE_TYPE=t3.medium
echo "Scaled to 3 instances of t3.medium"
echo "Cost will temporarily increase to ~$150/month"
