/**
 * Version0057_revert_to_working_state.js
 * 
 * This script reverts the project to the last working state from source control
 * with the commit message "Main list Items HR Payroll Banking working"
 * 
 * Version: 1.0
 * Date: 2025-05-03
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

// Configuration
const projectRoot = '/Users/kuoldeng/projectx';
const frontendRoot = path.join(projectRoot, 'frontend', 'pyfactor_next');

// Helper to execute terminal commands
function executeCommand(command, cwd = projectRoot) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      
      console.log(stdout);
      resolve(stdout);
    });
  });
}

// Backup current files before reverting
async function backupCurrentFiles() {
  const backupDir = path.join(projectRoot, 'scripts', 'backups', `pre-revert-${Date.now()}`);
  
  try {
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
    
    // Copy package.json, next.config.js and any other important files
    const filesToBackup = [
      path.join(frontendRoot, 'package.json'),
      path.join(frontendRoot, 'next.config.js'),
      path.join(frontendRoot, '.env.local'),
      path.join(frontendRoot, 'server.js')
    ];
    
    for (const file of filesToBackup) {
      try {
        if (await fs.stat(file).catch(() => false)) {
          const fileName = path.basename(file);
          const destPath = path.join(backupDir, fileName);
          await fs.copyFile(file, destPath);
          console.log(`Backed up ${file} to ${destPath}`);
        }
      } catch (err) {
        console.log(`Could not backup ${file}: ${err.message}`);
      }
    }
    
    return backupDir;
  } catch (error) {
    console.error(`Error creating backups: ${error.message}`);
    throw error;
  }
}

// Main function to revert to working state
async function main() {
  try {
    console.log('Starting reversion to last working state...');
    
    // 1. Backup current files
    const backupDir = await backupCurrentFiles();
    console.log(`Files backed up to: ${backupDir}`);
    
    // 2. Get the current status to show what files will be affected
    await executeCommand('git status', frontendRoot);
    
    // 3. Reset all changes (both staged and unstaged)
    await executeCommand('git reset --hard 9c23f4f5', frontendRoot);
    
    // 4. Clean untracked files and directories
    await executeCommand('git clean -fd', frontendRoot);
    
    // 5. Install dependencies
    console.log('\nRe-installing dependencies...');
    await executeCommand('pnpm install', frontendRoot);
    
    console.log('\n==============================================');
    console.log('🎉 Successfully reverted to last working state!');
    console.log('==============================================');
    console.log('\nTo launch the application:');
    console.log(`cd ${frontendRoot} && pnpm run dev`);
    console.log('\nOr for HTTPS:');
    console.log(`cd ${frontendRoot} && pnpm run dev:https`);
    console.log('\nIf you need any of your backed up files, they are in:');
    console.log(backupDir);
    
  } catch (error) {
    console.error('Failed to revert to working state:', error);
    console.log('\nManual reversion steps:');
    console.log('1. cd ' + frontendRoot);
    console.log('2. git reset --hard 9c23f4f5');
    console.log('3. git clean -fd');
    console.log('4. pnpm install');
  }
}

// Run the script
main().catch(console.error); 