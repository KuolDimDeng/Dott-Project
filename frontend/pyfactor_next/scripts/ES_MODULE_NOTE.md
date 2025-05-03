# ES Modules Usage Note

## Project Configuration

This project is configured to use ES Modules (ESM) rather than CommonJS. This is specified in the project's `package.json` with:

```json
{
  "type": "module"
}
```

## Script Development Guidelines

When writing Node.js scripts for this project, follow these guidelines:

1. **Use ES Module import/export syntax:**
   ```javascript
   // ✅ Correct - ES Modules
   import fs from 'fs';
   import { resolve, join } from 'path';
   
   // ❌ Incorrect - CommonJS
   const fs = require('fs');
   const path = require('path');
   ```

2. **Use the ESM-compatible equivalents for __dirname and __filename:**
   ```javascript
   // ✅ Correct - ES Modules
   import { fileURLToPath } from 'url';
   import { dirname } from 'path';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   
   // ❌ Incorrect - CommonJS
   // __dirname and __filename are not available in ES modules
   ```

3. **Always add a file extension when importing local modules:**
   ```javascript
   // ✅ Correct - ES Modules
   import { myFunction } from './utils.js';
   
   // ❌ Incorrect - May not work in ES Modules
   import { myFunction } from './utils';
   ```

4. **Use .mjs extension if you want to explicitly mark a file as an ES Module:**
   - In projects with `"type": "module"`, all `.js` files are treated as ES modules
   - Use `.cjs` for CommonJS modules
   - Use `.mjs` for ES modules in projects without `"type": "module"`

## Script Headers

Include a note in the script header to remind developers about the ES module requirement:

```javascript
/**
 * MyScript.js
 *
 * Description of what the script does.
 * 
 * NOTE: This script uses ES modules as the project is configured with "type": "module" in package.json
 */
```

## Running Scripts

When running scripts, ensure they are properly formatted for ES modules:

```bash
node scripts/my-script.js
```

## Error Troubleshooting

If you see errors like:

```
ReferenceError: require is not defined in ES module scope, you can use import instead
```

Convert the script to use ES module syntax as described above. 