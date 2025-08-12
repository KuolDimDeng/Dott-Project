#!/bin/bash

# Version0082_fix_django_settings_syntax.sh
# Version: 1.0.0
# Date: 2025-05-22
# Author: AI Assistant
# Purpose: Fix Python syntax error in Django settings that's causing deployment failure

# Text colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}===== FIXING DJANGO SETTINGS SYNTAX ERROR =====${NC}"
echo -e "${YELLOW}Fixing Python indentation error that's causing container to crash${NC}"

# Configuration
PREVIOUS_PACKAGE="minimal-ssl-fixed-20250522122745.zip"
NEW_PACKAGE="django-settings-fixed-$(date +%Y%m%d%H%M%S).zip"
TEMP_DIR="temp_settings_fix_$(date +%Y%m%d%H%M%S)"

# Check if the previous package exists
if [ ! -f "$PREVIOUS_PACKAGE" ]; then
    echo -e "${RED}Error: Previous package $PREVIOUS_PACKAGE not found${NC}"
    exit 1
fi

# Create temporary directory
echo -e "${YELLOW}Creating temporary directory...${NC}"
mkdir -p "$TEMP_DIR"

# Extract the package
echo -e "${YELLOW}Extracting package to temporary directory...${NC}"
unzip -q "$PREVIOUS_PACKAGE" -d "$TEMP_DIR"

# Fix the Django settings file
SETTINGS_FILE="$TEMP_DIR/pyfactor/settings_eb.py"
echo -e "${YELLOW}Fixing Django settings syntax error...${NC}"

# Create a proper Python script to fix the settings file
cat > "$TEMP_DIR/fix_settings_syntax.py" << 'EOF'
#!/usr/bin/env python3
"""
Fix Django settings syntax error caused by indentation issues
"""

def fix_settings_file():
    settings_file = 'pyfactor/settings_eb.py'
    
    try:
        # Read the current settings file
        with open(settings_file, 'r') as f:
            content = f.read()
        
        print(f"Original file size: {len(content)} characters")
        
        # Split into lines for easier processing
        lines = content.split('\n')
        fixed_lines = []
        
        # Process each line to fix indentation and syntax issues
        for i, line in enumerate(lines):
            # Skip empty lines at the end
            if i == len(lines) - 1 and line.strip() == '':
                continue
                
            # Fix common indentation issues
            if line.strip().startswith('SECURE_') or line.strip().startswith('SESSION_') or line.strip().startswith('CSRF_'):
                # These should be at top level (no indentation)
                fixed_line = line.strip()
                if fixed_line:
                    fixed_lines.append(fixed_line)
            elif line.strip().startswith('print('):
                # Print statements should also be at top level
                fixed_line = line.strip()
                if fixed_line:
                    fixed_lines.append(fixed_line)
            else:
                # Keep other lines as they are, but clean up excessive whitespace
                if line.strip():
                    fixed_lines.append(line.rstrip())
                elif fixed_lines and fixed_lines[-1].strip():  # Only add empty lines between content
                    fixed_lines.append('')
        
        # Ensure file ends with a single newline
        if fixed_lines and fixed_lines[-1] != '':
            fixed_lines.append('')
        
        # Write the fixed content back
        fixed_content = '\n'.join(fixed_lines)
        
        with open(settings_file, 'w') as f:
            f.write(fixed_content)
        
        print(f"✓ Django settings file fixed")
        print(f"Fixed file size: {len(fixed_content)} characters")
        print(f"Lines processed: {len(lines)} -> {len(fixed_lines)}")
        
        # Validate Python syntax
        try:
            compile(fixed_content, settings_file, 'exec')
            print("✓ Python syntax validation passed")
        except SyntaxError as e:
            print(f"✗ Syntax error still present: {e}")
            print(f"Line {e.lineno}: {e.text}")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Error fixing settings file: {e}")
        return False

if __name__ == '__main__':
    success = fix_settings_file()
    exit(0 if success else 1)
EOF

# Run the syntax fix script
cd "$TEMP_DIR" && python3 fix_settings_syntax.py
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to fix Django settings syntax${NC}"
    exit 1
fi
cd ..

echo -e "${GREEN}✓ Django settings syntax fixed${NC}"

# Verify the settings file can be parsed
echo -e "${YELLOW}Verifying Django settings syntax...${NC}"
cd "$TEMP_DIR" && python3 -m py_compile pyfactor/settings_eb.py
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Django settings syntax validation passed${NC}"
else
    echo -e "${RED}✗ Django settings still has syntax errors${NC}"
    exit 1
fi
cd ..

# Create a simple SSL configuration (just the listener, no complex Django settings)
echo -e "${YELLOW}Ensuring SSL configuration is minimal and correct...${NC}"

# Verify the SSL config file exists and is correct
SSL_CONFIG="$TEMP_DIR/.ebextensions/07_https_minimal.config"
if [ -f "$SSL_CONFIG" ]; then
    echo -e "${GREEN}✓ SSL configuration file exists${NC}"
    cat "$SSL_CONFIG"
else
    echo -e "${YELLOW}Creating minimal SSL configuration...${NC}"
    cat > "$SSL_CONFIG" << 'EOF'
# Minimal HTTPS/SSL Configuration for Application Load Balancer
option_settings:
  aws:elbv2:listener:443:
    ListenerEnabled: 'true'
    Protocol: HTTPS
    SSLCertificateArns: arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810
EOF
    echo -e "${GREEN}✓ Created minimal SSL configuration${NC}"
fi

# Create the new package
echo -e "${YELLOW}Creating syntax-fixed package...${NC}"
cd "$TEMP_DIR" && zip -r "../$NEW_PACKAGE" * .ebextensions .dockerignore 2>/dev/null
cd ..

# Check if package was created successfully
if [ ! -f "$NEW_PACKAGE" ]; then
    echo -e "${RED}Error: Failed to create syntax-fixed package${NC}"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$NEW_PACKAGE" | cut -f1)
echo -e "${GREEN}✓ Created syntax-fixed package: $NEW_PACKAGE ($PACKAGE_SIZE)${NC}"

# Clean up temporary directory
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓ Cleanup complete${NC}"

echo -e "${BLUE}============== DJANGO SETTINGS SYNTAX FIX COMPLETED ==============${NC}"
echo -e "${GREEN}1. ✅ Fixed Python indentation errors in Django settings${NC}"
echo -e "${GREEN}2. ✅ Validated Python syntax${NC}"
echo -e "${GREEN}3. ✅ Preserved minimal SSL configuration${NC}"
echo -e "${BLUE}=================================================================${NC}"

echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo -e "${BLUE}1. Update deployment script FIXED_PACKAGE to: $NEW_PACKAGE${NC}"
echo -e "${BLUE}2. Deploy the syntax-fixed package${NC}"
echo -e "${BLUE}3. The SSL configuration should now work properly${NC}"

echo -e "${GREEN}🔧 Django settings syntax error should now be resolved!${NC}"
echo -e "${GREEN}📦 Package ready: $NEW_PACKAGE${NC}" 