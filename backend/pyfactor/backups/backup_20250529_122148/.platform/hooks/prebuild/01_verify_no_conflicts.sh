#!/bin/bash
echo "Checking for conflicting dependencies..."
if grep -E "urllib3==2|urllib3==3" requirements.txt; then
    echo "ERROR: Found incompatible urllib3 version in requirements.txt"
    exit 1
fi

echo "No conflicting dependencies found"
chmod +x .platform/hooks/prebuild/01_verify_no_conflicts.sh
