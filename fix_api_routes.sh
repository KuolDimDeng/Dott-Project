#!/bin/bash

# Script to add dynamic export configuration to all API routes
echo "Adding dynamic export configuration to API routes..."

# Find all route.js files in src/app/api
find src/app/api -name "route.js" -type f | while read -r file; do
    # Check if the file already has dynamic export
    if ! grep -q "export const dynamic" "$file"; then
        echo "Processing: $file"
        
        # Create a temporary file with the dynamic export added
        {
            # Add dynamic export after imports
            awk '
            /^import.*from/ { print; next }
            /^$/ && !added_dynamic && imported {
                print ""
                print "// Force dynamic rendering for this API route"
                print "export const dynamic = '\''force-dynamic'\'';"
                print ""
                added_dynamic = 1
                next
            }
            /^import/ { imported = 1 }
            { print }
            ' "$file"
        } > "${file}.tmp"
        
        # Replace the original file
        mv "${file}.tmp" "$file"
        echo "✅ Added dynamic export to $file"
    else
        echo "⏭️  $file already has dynamic export"
    fi
done

echo "✅ Completed adding dynamic exports to API routes" 