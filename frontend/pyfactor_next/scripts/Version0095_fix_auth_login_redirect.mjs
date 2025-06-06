// Version0095_fix_auth_login_redirect.mjs

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const filePath = join(process.cwd(), 'src/app/api/auth/login/route.js');
const backupPath = join(process.cwd(), `src/app/api/auth/login/route.js.backup_${new Date().toISOString().split('T')[0]}`);

try {
  // Create a backup of the original file
  const originalContent = await readFile(filePath, 'utf-8');
  await writeFile(backupPath, originalContent);

  // Modify the content to ensure consistent use of NextResponse.redirect()
  const updatedContent = originalContent.replace(
    /response\.headers\.set\('x-middleware-rewrite', request\.url\);/g,
    ''
  );

  await writeFile(filePath, updatedContent);
  console.log('Successfully updated route.js to use NextResponse.redirect() consistently.');
} catch (error) {
  console.error('Error applying fix to route.js:', error);
}
