#!/bin/bash

# 🏗️ Create Domain-Driven Frontend Architecture
# This script creates the production-ready folder structure

echo "🏗️ CREATING DOMAIN-DRIVEN ARCHITECTURE"
echo "======================================"

BASE_DIR="/Users/kuoldeng/projectx/frontend/pyfactor_next/src"

# Create main domain structure
echo "📁 Creating domain directories..."

DOMAINS=("products" "customers" "invoices" "transactions" "analytics" "reports" "banking" "payroll" "taxes")

for domain in "${DOMAINS[@]}"; do
    echo "  Creating domains/$domain..."
    mkdir -p "$BASE_DIR/domains/$domain/components"
    mkdir -p "$BASE_DIR/domains/$domain/hooks" 
    mkdir -p "$BASE_DIR/domains/$domain/services"
    mkdir -p "$BASE_DIR/domains/$domain/types"
    mkdir -p "$BASE_DIR/domains/$domain/utils"
    
    # Create index files for easy imports
    cat > "$BASE_DIR/domains/$domain/index.js" << EOF
// $domain domain exports
export * from './components';
export * from './hooks';
export * from './services';
EOF

    cat > "$BASE_DIR/domains/$domain/components/index.js" << EOF
// $domain components
// Export components as they are created
EOF

    cat > "$BASE_DIR/domains/$domain/hooks/index.js" << EOF
// $domain hooks
// Export hooks as they are created
EOF

    cat > "$BASE_DIR/domains/$domain/services/index.js" << EOF
// $domain services
// Export services as they are created
EOF
done

# Create shared components structure
echo "📁 Creating shared components structure..."
mkdir -p "$BASE_DIR/shared/components/ui"
mkdir -p "$BASE_DIR/shared/components/forms"
mkdir -p "$BASE_DIR/shared/components/tables"
mkdir -p "$BASE_DIR/shared/components/modals"
mkdir -p "$BASE_DIR/shared/hooks"
mkdir -p "$BASE_DIR/shared/services"
mkdir -p "$BASE_DIR/shared/utils"
mkdir -p "$BASE_DIR/shared/types"

# Create shared component index files
cat > "$BASE_DIR/shared/components/ui/index.js" << 'EOF'
// Shared UI Components Library
// Components will be extracted from existing files

// Example structure:
// export { Button } from './Button';
// export { Input } from './Input';
// export { Modal } from './Modal';
// export { Table } from './Table';
// export { Typography } from './Typography'; 
// export { Tooltip } from './Tooltip';
EOF

cat > "$BASE_DIR/shared/services/index.js" << 'EOF'
// Shared Services
// Services will be extracted from apiClient.js

// Example structure:
// export { apiService } from './apiService';
// export { authService } from './authService';
EOF

cat > "$BASE_DIR/shared/hooks/index.js" << 'EOF'
// Shared Hooks
// Common hooks used across domains

// Example structure:
// export { useApi } from './useApi';
// export { useAuth } from './useAuth';
// export { useTable } from './useTable';
EOF

# Create domain barrel export
cat > "$BASE_DIR/domains/index.js" << 'EOF'
// Domain exports
// Import domains as they are implemented

// Example structure:
// export * from './products';
// export * from './customers';
// export * from './invoices';
EOF

echo ""
echo "✅ DOMAIN STRUCTURE CREATED SUCCESSFULLY"
echo "======================================="
echo ""
echo "📁 Created directories:"
echo "   - domains/ (9 business domains)"
echo "   - shared/components/ui/"
echo "   - shared/services/"
echo "   - shared/hooks/"
echo ""
echo "🎯 NEXT STEPS:"
echo "1. Run: ./scripts/extract-shared-components.sh"
echo "2. Run: ./scripts/extract-product-domain.sh"
echo "3. Test the structure works"
echo ""
echo "📋 CREATED STRUCTURE:"
tree "$BASE_DIR/domains" -I node_modules 2>/dev/null || ls -la "$BASE_DIR/domains"
echo ""
tree "$BASE_DIR/shared" -I node_modules 2>/dev/null || ls -la "$BASE_DIR/shared"