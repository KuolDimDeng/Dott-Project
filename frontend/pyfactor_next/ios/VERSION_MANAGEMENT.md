# iOS Version Management Guide for Dott App

## Understanding iOS Versioning

iOS apps have two version numbers:
1. **Marketing Version (CFBundleShortVersionString)**: The version users see (e.g., 1.0.0)
2. **Build Number (CFBundleVersion)**: Internal build identifier (e.g., 1, 2, 3...)

## Current Version Status
- **Marketing Version**: 1.0
- **Build Number**: 1

## Version Management Methods

### Method 1: Manual Version Update in Xcode (Recommended)

1. **Open Xcode Project**
   ```bash
   cd /Users/kuoldeng/projectx/frontend/pyfactor_next/ios/App
   open App.xcworkspace
   ```

2. **Update Version in Xcode**
   - Select the App project in navigator
   - Select the App target
   - Go to "General" tab
   - Update "Version" (Marketing Version) for new releases
   - Update "Build" number for every archive

3. **Version Numbering Strategy**
   - **Marketing Version**: Use semantic versioning (MAJOR.MINOR.PATCH)
     - 1.0.0 → 1.0.1 (bug fixes)
     - 1.0.0 → 1.1.0 (new features)
     - 1.0.0 → 2.0.0 (breaking changes)
   - **Build Number**: Increment for every upload to TestFlight/App Store
     - Can be simple counter: 1, 2, 3, 4...
     - Or timestamp-based (not recommended for your current setup)

### Method 2: Command Line Updates (Before Archive)

```bash
# Update marketing version (for new releases)
cd /Users/kuoldeng/projectx/frontend/pyfactor_next/ios/App
agvtool new-marketing-version 1.0.1

# Increment build number (for every archive)
agvtool next-version -all

# Or set specific build number
agvtool new-version -all 2
```

### Method 3: Automated Script

Create this script to automate version management:

```bash
#!/bin/bash
# save as: increment-version.sh

cd /Users/kuoldeng/projectx/frontend/pyfactor_next/ios/App

echo "Current versions:"
echo "Marketing Version: $(agvtool what-marketing-version -terse1)"
echo "Build Number: $(agvtool what-version -terse)"

echo ""
echo "Choose an option:"
echo "1. Increment build number only (for new TestFlight build)"
echo "2. Update patch version (1.0.0 → 1.0.1)"
echo "3. Update minor version (1.0.0 → 1.1.0)"
echo "4. Update major version (1.0.0 → 2.0.0)"
echo "5. Set custom version"

read -p "Enter choice (1-5): " choice

case $choice in
    1)
        agvtool next-version -all
        echo "Build number incremented!"
        ;;
    2)
        current=$(agvtool what-marketing-version -terse1)
        IFS='.' read -ra ADDR <<< "$current"
        new_version="${ADDR[0]}.${ADDR[1]}.$((ADDR[2] + 1))"
        agvtool new-marketing-version $new_version
        agvtool next-version -all
        echo "Updated to version $new_version"
        ;;
    3)
        current=$(agvtool what-marketing-version -terse1)
        IFS='.' read -ra ADDR <<< "$current"
        new_version="${ADDR[0]}.$((ADDR[1] + 1)).0"
        agvtool new-marketing-version $new_version
        agvtool next-version -all
        echo "Updated to version $new_version"
        ;;
    4)
        current=$(agvtool what-marketing-version -terse1)
        IFS='.' read -ra ADDR <<< "$current"
        new_version="$((ADDR[0] + 1)).0.0"
        agvtool new-marketing-version $new_version
        agvtool next-version -all
        echo "Updated to version $new_version"
        ;;
    5)
        read -p "Enter marketing version (e.g., 1.2.0): " marketing_version
        read -p "Enter build number: " build_number
        agvtool new-marketing-version $marketing_version
        agvtool new-version -all $build_number
        echo "Updated to version $marketing_version (build $build_number)"
        ;;
    *)
        echo "Invalid choice"
        ;;
esac

echo ""
echo "New versions:"
echo "Marketing Version: $(agvtool what-marketing-version -terse1)"
echo "Build Number: $(agvtool what-version -terse)"
```

## Archive Process with Version Management

### Step 1: Update Capacitor Build
```bash
cd /Users/kuoldeng/projectx/frontend/pyfactor_next
pnpm run build
npx cap sync ios
```

### Step 2: Increment Version
```bash
cd ios/App
# For new TestFlight build (same marketing version)
agvtool next-version -all

# For new release version
agvtool new-marketing-version 1.0.1
agvtool next-version -all
```

### Step 3: Create Archive in Xcode
1. Open Xcode: `open App.xcworkspace`
2. Select "Any iOS Device" as destination
3. Menu: Product → Archive
4. Wait for archive to complete

### Step 4: Upload to App Store Connect
1. In Organizer window, select your archive
2. Click "Distribute App"
3. Choose "App Store Connect"
4. Follow the upload wizard

## Best Practices

1. **Always increment build number** for each upload to TestFlight/App Store
2. **Keep a version log** to track what changes are in each version
3. **Use semantic versioning** for marketing version
4. **Tag releases in Git** to match your app versions:
   ```bash
   git tag -a v1.0.1 -m "Version 1.0.1 - Bug fixes"
   git push origin v1.0.1
   ```

## Version History Log Template

Create a VERSIONS.md file to track releases:

```markdown
# Version History

## v1.0.1 (Build 2) - 2024-XX-XX
### Fixed
- Fixed Orders button navigation
- Fixed consumer location tracking

## v1.0.0 (Build 1) - 2024-XX-XX
### Features
- Initial release
- Business and Consumer modes
- Order management system
```

## Troubleshooting

### Build Number Not Updating
If build number doesn't update in archive:
1. Clean build folder: Shift+Cmd+K in Xcode
2. Close Xcode
3. Update version via command line
4. Reopen Xcode and archive

### Version Conflicts in TestFlight
- Each upload must have unique build number
- Same marketing version can have multiple builds
- Once uploaded, a build number cannot be reused

## Quick Commands Reference

```bash
# Check current versions
agvtool what-marketing-version -terse1
agvtool what-version -terse

# Increment build only
agvtool next-version -all

# Set specific marketing version
agvtool new-marketing-version 1.0.2

# Set specific build number
agvtool new-version -all 5

# Sync after version change
cd ../..
npx cap sync ios
```

## Automating with CI/CD (Optional)

For GitHub Actions or other CI/CD:
```yaml
- name: Increment build number
  run: |
    cd ios/App
    BUILD_NUMBER=${{ github.run_number }}
    agvtool new-version -all $BUILD_NUMBER
```

This ensures unique build numbers for every CI run.