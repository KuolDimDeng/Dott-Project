#!/bin/bash

# 🔒 CSRF PROTECTION IMPLEMENTATION PLAN
# Step-by-step guide to add CSRF protection to all API routes

echo "🔒 CSRF PROTECTION IMPLEMENTATION GUIDE"
echo "======================================="

# Step 1: Identify all API routes that need CSRF protection
echo ""
echo "📋 STEP 1: IDENTIFY API ROUTES NEEDING CSRF PROTECTION"
echo "====================================================="

echo ""
echo "🔍 Finding all API routes with POST/PUT/DELETE methods..."

# Find all API route files
find frontend/pyfactor_next/src/app/api -name "route.js" > /tmp/api_routes.txt

echo "📁 Found $(wc -l < /tmp/api_routes.txt) API route files:"
cat /tmp/api_routes.txt

echo ""
echo "🔍 Checking which routes have state-changing methods:"

# Check for POST/PUT/DELETE exports
while IFS= read -r file; do
    if grep -q "export async function \(POST\|PUT\|DELETE\)" "$file"; then
        echo "🚨 NEEDS CSRF: $file"
        echo "   Methods: $(grep "export async function \(POST\|PUT\|DELETE\)" "$file" | sed 's/export async function //' | sed 's/(.*$//' | tr '\n' ' ')"
    fi
done < /tmp/api_routes.txt

echo ""
echo "📋 STEP 2: IMPLEMENTATION PRIORITY"
echo "=================================="

echo ""
echo "🔥 HIGH PRIORITY (implement first):"
echo "   - /api/auth/* routes"
echo "   - /api/settings/* routes"
echo "   - /api/user/* routes"
echo "   - /api/customers/* routes"
echo ""
echo "📈 MEDIUM PRIORITY:"
echo "   - /api/pos/* routes"
echo "   - /api/inventory/* routes"
echo "   - /api/payroll/* routes"
echo ""

# Step 3: Create implementation template
echo "📋 STEP 3: IMPLEMENTATION TEMPLATE"
echo "================================="

cat > csrf-protection-template.js << 'TEMPLATE'
import { NextResponse } from 'next/server';
import { validateCSRFToken } from '@/utils/csrfProtection';

export async function POST(request) {
  try {
    // STEP 1: CSRF Protection
    const csrfToken = request.headers.get('x-csrf-token');
    if (!validateCSRFToken(csrfToken)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // STEP 2: Your existing logic here
    const data = await request.json();
    
    // ... rest of your code
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
TEMPLATE

echo ""
echo "📄 Template created: csrf-protection-template.js"
echo ""

# Step 4: Create automated implementation script
echo "📋 STEP 4: SEMI-AUTOMATED IMPLEMENTATION"
echo "========================================"

cat > implement-csrf-auto.sh << 'AUTOCSRF'
#!/bin/bash

echo "🔒 Implementing CSRF protection automatically..."

# List of high-priority API files to update
HIGH_PRIORITY_APIS=(
    "frontend/pyfactor_next/src/app/api/auth"
    "frontend/pyfactor_next/src/app/api/settings" 
    "frontend/pyfactor_next/src/app/api/user"
    "frontend/pyfactor_next/src/app/api/customers"
)

for api_dir in "${HIGH_PRIORITY_APIS[@]}"; do
    if [ -d "$api_dir" ]; then
        echo "🔍 Processing $api_dir..."
        
        # Find all route.js files in this directory
        find "$api_dir" -name "route.js" | while read -r file; do
            echo "  📄 Checking $file..."
            
            # Check if it has POST/PUT/DELETE and doesn't already have CSRF
            if grep -q "export async function \(POST\|PUT\|DELETE\)" "$file" && \
               ! grep -q "validateCSRFToken\|x-csrf-token" "$file"; then
                
                echo "  🚨 NEEDS CSRF: $file"
                
                # Create backup
                cp "$file" "$file.pre-csrf-backup"
                
                # Add CSRF import if not present
                if ! grep -q "csrfProtection" "$file"; then
                    sed -i '1i import { validateCSRFToken } from '\''@/utils/csrfProtection'\'';' "$file"
                fi
                
                echo "  ✅ Added CSRF import to $file"
                echo "  ⚠️  MANUAL REVIEW REQUIRED: Add CSRF validation logic"
            fi
        done
    fi
done

echo ""
echo "✅ Automated processing complete!"
echo "⚠️  IMPORTANT: Manual review and testing required!"
AUTOCSRF

chmod +x implement-csrf-auto.sh

echo ""
echo "📋 STEP 5: MANUAL IMPLEMENTATION STEPS"
echo "======================================"

echo ""
echo "For each API route file:"
echo ""
echo "1️⃣ Add import:"
echo "   import { validateCSRFToken } from '@/utils/csrfProtection';"
echo ""
echo "2️⃣ Add validation at start of POST/PUT/DELETE functions:"
echo "   const csrfToken = request.headers.get('x-csrf-token');"
echo "   if (!validateCSRFToken(csrfToken)) {"
echo "     return NextResponse.json("
echo "       { error: 'Invalid CSRF token' },"
echo "       { status: 403 }"
echo "     );"
echo "   }"
echo ""
echo "3️⃣ Update frontend to send CSRF tokens:"
echo "   import { addCSRFHeaders } from '@/utils/csrfProtection';"
echo "   const headers = addCSRFHeaders({'Content-Type': 'application/json'});"
echo ""

# Step 6: Testing checklist
echo "📋 STEP 6: TESTING CHECKLIST"
echo "============================="

cat > csrf-testing-checklist.md << 'TESTING'
# CSRF Protection Testing Checklist

## ✅ Functional Testing
- [ ] Login flow works with CSRF tokens
- [ ] Settings updates work with CSRF tokens  
- [ ] User profile updates work with CSRF tokens
- [ ] Customer creation/updates work with CSRF tokens
- [ ] All forms submit successfully

## ✅ Security Testing
- [ ] Requests without CSRF token are rejected (403 error)
- [ ] Requests with invalid CSRF token are rejected
- [ ] CSRF tokens are properly generated and unique
- [ ] CSRF tokens expire appropriately

## ✅ Browser Testing
- [ ] No CSRF errors in browser console
- [ ] Forms work in Chrome/Firefox/Safari
- [ ] Authentication flows work across browsers

## ✅ API Testing
Use these curl commands to test:

```bash
# Test without CSRF token (should fail)
curl -X POST http://localhost:3000/api/settings/taxes \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test with valid CSRF token (should work)
curl -X POST http://localhost:3000/api/settings/taxes \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: valid-token-here" \
  -d '{"test": "data"}'
```
TESTING

echo ""
echo "📄 Testing checklist created: csrf-testing-checklist.md"
echo ""
echo "⏱️  ESTIMATED TIME: 1-2 hours"
echo "👥 REQUIRES: Developer with API knowledge"
echo ""
echo "🎯 SUCCESS CRITERIA:"
echo "✅ All state-changing API routes have CSRF protection"
echo "✅ Frontend sends CSRF tokens with all requests"
echo "✅ Invalid requests return 403 Forbidden"
echo "✅ All existing functionality works"

echo ""
echo "Files created:"
echo "  - csrf-protection-template.js"
echo "  - implement-csrf-auto.sh"
echo "  - csrf-testing-checklist.md"