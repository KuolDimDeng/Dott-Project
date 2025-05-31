#!/bin/bash
echo "⬇️ Scaling back down to optimized configuration..."
eb scale 1
eb setenv EB_INSTANCE_TYPE=t3.small
echo "Scaled back to 1 instance of t3.small"
echo "Cost back to optimized $40/month"
