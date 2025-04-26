# Mock Data Removal

## Overview

This set of scripts removes all mock data functionality from the application to ensure compliance with production requirements that specify:

- No mock data (connect to live AWS RDS database only)
- No cookies or local storage usage
- Strict tenant isolation

## Scripts

The following scripts are provided to remove mock data functionality:

1. **Version0001_remove_mock_data_from_apiClient.mjs**
   - Removes mock data functionality from the employeeApi in apiClient.js
   - Ensures all API calls go to the real backend

2. **Version0001_remove_mock_hr_api_route.mjs**
   - Replaces the mock HR employees API route with an error response
   - Prevents any fallback to local mock data

3. **Version0001_remove_mock_data_from_EmployeeManagement.mjs**
   - Removes mock data toggle button and functionality from the EmployeeManagement component
   - Eliminates all localStorage usage for mock mode preferences

4. **run_mock_data_removal.mjs**
   - Master script that runs all the above scripts in the correct order
   - Provides a summary of the changes made

## ES Modules

This project uses ES Modules (ESM) instead of CommonJS. All scripts have the `.mjs` extension to indicate they are ES modules. Key differences:

- Use `import` statements instead of `require()`
- Use `fileURLToPath` and `import.meta.url` to get file paths
- Use the `.mjs` extension to ensure Node.js treats the files as ES modules

## Usage

To remove all mock data functionality from the application:

```bash
# Navigate to the project root directory
cd /Users/kuoldeng/projectx

# Run the master script
node scripts/run_mock_data_removal.mjs
```

Each script will:
1. Create a backup of the original files in `scripts/backups/mock_data_removal_[timestamp]/`
2. Apply the necessary changes
3. Update the script registry

## Verification

After running the scripts, verify that:

1. The application connects to the real backend only
2. No mock data toggle buttons appear in the UI
3. No localStorage usage for mock data exists
4. The mock HR API route returns a 501 error if accessed directly

## Backups

Backups of all modified files are stored in:

```
scripts/backups/mock_data_removal_[timestamp]/
```

To restore a backup if needed:

```bash
# Copy the backup file back to its original location
cp scripts/backups/mock_data_removal_[timestamp]/EmployeeManagement.js.backup frontend/pyfactor_next/src/app/dashboard/components/forms/EmployeeManagement.js
```

## Script Registry

All scripts are recorded in the script registry at:

```
scripts/script_registry.md
```

This registry tracks:
- Script name
- Execution date
- Status (Completed/Failed)
- Description of changes made

## Troubleshooting

If any script fails to run:

1. Check the error message in the console
2. Verify that the target files exist in the expected locations
3. Run the individual script directly for more detailed error information:
   ```bash
   node scripts/Version0001_remove_mock_data_from_EmployeeManagement.mjs
   ```
4. If necessary, restore from backups and try again 