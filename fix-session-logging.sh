#!/bin/bash

# 🔐 SESSION LOGGING SECURITY FIX
# This script identifies and helps fix session token logging vulnerabilities

echo "🔍 SCANNING FOR SESSION TOKEN LOGGING VULNERABILITIES..."
echo "================================================================"

# Step 1: Find all files with session token logging
echo "📁 Finding files with session token logging..."

# Create temporary file to store results
RESULTS_FILE="/tmp/session_logging_files.txt"
FIXES_FILE="/tmp/session_logging_fixes.txt"

# Search for session ID logging patterns
find frontend/pyfactor_next/src -name "*.js" -o -name "*.tsx" -o -name "*.ts" | \
xargs grep -l "console\.log.*[Ss]ession.*[Ii][Dd]" > "$RESULTS_FILE"

# Count files found
FILE_COUNT=$(wc -l < "$RESULTS_FILE")

if [ "$FILE_COUNT" -eq 0 ]; then
    echo "✅ No session logging vulnerabilities found!"
    exit 0
fi

echo "🚨 Found $FILE_COUNT files with session token logging:"
echo ""
cat "$RESULTS_FILE"
echo ""

# Step 2: Show specific problematic lines
echo "🔍 PROBLEMATIC LINES FOUND:"
echo "=========================="

while IFS= read -r file; do
    if [ -f "$file" ]; then
        echo ""
        echo "📄 File: $file"
        echo "-----------------------------------"
        grep -n "console\.log.*[Ss]ession.*[Ii][Dd]" "$file" | head -5
    fi
done < "$RESULTS_FILE"

echo ""
echo "🛠️ GENERATING FIXES..."
echo "====================="

# Step 3: Generate specific fix commands
cat > "$FIXES_FILE" << 'EOF'
# MANUAL FIXES REQUIRED - Replace these patterns:

# Pattern 1: console.log('[Component] Session ID:', sessionId)
# Replace with: secureLog.session('[Component] Session ID', sessionId)

# Pattern 2: console.log('Session token:', token.substring(0, 8) + '...')
# Replace with: secureLog.session('Session token', token)

# Pattern 3: console.log('🔴 [Component] Token:', token)
# Replace with: secureLog.token('🔴 [Component] Token', token)

# IMPORT REQUIRED in each file:
# Add: import { secureLog } from '@/utils/secureLogger';
EOF

echo ""
echo "📋 STEP-BY-STEP FIX INSTRUCTIONS:"
echo "================================="
echo ""
echo "1️⃣ For each file listed above:"
echo "   - Add import: import { secureLog } from '@/utils/secureLogger';"
echo "   - Replace console.log with secureLog.session() or secureLog.token()"
echo ""
echo "2️⃣ Priority order (fix these first):"

# Find the most critical files (session bridge, auth components)
echo "   🔥 CRITICAL FILES (fix immediately):"
grep -E "(session-bridge|auth|login)" "$RESULTS_FILE" | head -5

echo ""
echo "   📈 HIGH PRIORITY FILES:"
grep -E "(api|middleware|utils)" "$RESULTS_FILE" | head -10

echo ""
echo "3️⃣ Testing after fixes:"
echo "   - Test login flow"
echo "   - Test session refresh"
echo "   - Check logs contain no full tokens"
echo ""

# Step 4: Create a sample fix for one file
echo "4️⃣ EXAMPLE FIX:"
echo "==============="
echo ""
echo "BEFORE:"
echo "console.log('[SessionBridge] Session ID:', sessionId);"
echo ""
echo "AFTER:"
echo "import { secureLog } from '@/utils/secureLogger';"
echo "secureLog.session('[SessionBridge] Session ID', sessionId);"
echo ""

# Create automated fix script for common patterns
echo "5️⃣ SEMI-AUTOMATED FIX SCRIPT:"
echo "=============================="

cat > fix-session-logs-auto.sh << 'AUTOFIX'
#!/bin/bash
# Semi-automated session logging fixes

echo "🔧 Applying automated session logging fixes..."

# Fix Pattern 1: Simple session ID logging
find frontend/pyfactor_next/src -name "*.js" -exec sed -i.bak 's/console\.log(\(.*\)[Ss]ession.*[Ii][Dd].*:.*sessionId)/secureLog.session(\1, sessionId)/g' {} \;

# Fix Pattern 2: Session token logging  
find frontend/pyfactor_next/src -name "*.js" -exec sed -i.bak 's/console\.log(\(.*\)[Ss]ession.*[Tt]oken.*:.*token)/secureLog.session(\1, token)/g' {} \;

echo "⚠️  IMPORTANT: Manual review required!"
echo "   - Check all .bak files created"
echo "   - Add secureLog imports where needed"
echo "   - Test thoroughly before committing"
AUTOFIX

chmod +x fix-session-logs-auto.sh

echo ""
echo "✅ AUTOMATED SCRIPT CREATED: fix-session-logs-auto.sh"
echo "   ⚠️  Review changes carefully before using!"
echo ""
echo "🎯 COMPLETION CRITERIA:"
echo "======================"
echo "✅ All session tokens show as 'abc12345...' in logs"
echo "✅ No full tokens visible in browser console"  
echo "✅ Authentication flows still work correctly"
echo "✅ All files have secureLog imports"
echo ""
echo "📊 ESTIMATED TIME: 2-3 hours for $FILE_COUNT files"
echo ""
echo "Results saved to:"
echo "  - Files list: $RESULTS_FILE"
echo "  - Fix guide: $FIXES_FILE"

rm -f fix-session-logs-auto.sh.bak 2>/dev/null