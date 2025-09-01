#!/bin/bash

# Quick script to check current iOS app versions

cd /Users/kuoldeng/projectx/frontend/pyfactor_next/ios/App

echo "======================================"
echo "   Dott iOS App Version Info"
echo "======================================"
echo ""
echo "Marketing Version: $(agvtool what-marketing-version -terse1)"
echo "Build Number: $(agvtool what-version -terse)"
echo ""
echo "Bundle ID: $(defaults read $(pwd)/App/Info.plist CFBundleIdentifier 2>/dev/null || echo "com.dottapps.mobile")"
echo "Display Name: $(defaults read $(pwd)/App/Info.plist CFBundleDisplayName 2>/dev/null || echo "Dott")"
echo ""
echo "Recent Git Tags:"
git tag -l "v*" --sort=-version:refname | head -5
echo ""
echo "======================================"