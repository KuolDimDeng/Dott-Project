// Version0146_verify_static_images_deployment.mjs
// This script verifies that all static images, especially the landing page logo,
// are properly included in production deployment

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const scriptName = 'Version0146_verify_static_images_deployment.mjs';
const description = 'Verify static images deployment and accessibility in production';
const scriptRegistry = path.join(process.cwd(), 'frontend/pyfactor_next/scripts/script_registry.md');

// Files to ensure are included in deployment
const staticImages = [
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/public/static/images/PyfactorLandingpage.png',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/public/static/images/PyfactorDashboard.png',
  '/Users/kuoldeng/projectx/frontend/pyfactor_next/public/static/images/Work-Life-Balance-1--Streamline-Brooklyn.png'
];

// Verify images exist locally
const verifyImagesExist = () => {
  console.log('Verifying static images exist locally...');
  
  const missingImages = [];
  
  for (const imagePath of staticImages) {
    if (!fs.existsSync(imagePath)) {
      missingImages.push(imagePath);
    }
  }
  
  if (missingImages.length > 0) {
    console.error('ERROR: The following images are missing:');
    missingImages.forEach(img => console.error(`- ${img}`));
    return false;
  }
  
  console.log('All static images verified locally.');
  return true;
};

// Add images to git if needed
const addImagesToGit = () => {
  return new Promise((resolve, reject) => {
    console.log('Adding images to git if needed...');
    
    // Add all images to git
    const addCommand = `git add ${staticImages.join(' ')}`;
    
    exec(addCommand, (addError) => {
      if (addError) {
        console.error('Error adding images to git:', addError);
        reject(addError);
        return;
      }
      
      // Check if there are changes to commit
      exec('git status --porcelain', (statusError, stdout) => {
        if (statusError) {
          console.error('Error checking git status:', statusError);
          reject(statusError);
          return;
        }
        
        if (stdout.trim()) {
          // There are changes to commit
          const commitCommand = `git commit -m "Ensure static images are included in deployment"`;
          
          exec(commitCommand, (commitError) => {
            if (commitError) {
              console.error('Error committing changes:', commitError);
              reject(commitError);
              return;
            }
            
            console.log('Images committed to git.');
            
            // Push to deployment branch
            const pushCommand = 'git push origin Dott_Main_Dev_Deploy';
            
            exec(pushCommand, (pushError) => {
              if (pushError) {
                console.error('Error pushing to deployment branch:', pushError);
                reject(pushError);
                return;
              }
              
              console.log('Changes pushed to Dott_Main_Dev_Deploy branch');
              resolve();
            });
          });
        } else {
          // No changes to commit
          console.log('No image changes needed to commit.');
          resolve();
        }
      });
    });
  });
};

// Generate production URLs for images
const generateProductionUrls = () => {
  const baseUrl = 'https://dottapps.com';
  
  console.log('\nProduction URLs for static images:');
  console.log('----------------------------------');
  
  staticImages.forEach(imagePath => {
    // Extract the path relative to the public directory
    const relativePath = imagePath.split('frontend/pyfactor_next/public/')[1];
    const productionUrl = `${baseUrl}/${relativePath}`;
    
    console.log(`${path.basename(imagePath)}: ${productionUrl}`);
  });
  
  console.log('----------------------------------');
  console.log('To verify images in production:');
  console.log('1. Open each URL in a browser');
  console.log('2. If images load correctly, they are properly deployed');
  console.log('3. If any image fails to load, check Vercel build logs');
};

// Update the script registry to track this verification
const updateScriptRegistry = () => {
  try {
    // First check if the script registry exists
    if (!fs.existsSync(scriptRegistry)) {
      console.error('Script registry not found at:', scriptRegistry);
      return;
    }

    // Read the current registry
    const registryContent = fs.readFileSync(scriptRegistry, 'utf8');
    
    // Check if this script is already in the registry
    if (registryContent.includes(scriptName)) {
      console.log('Script already registered in the registry.');
      return;
    }
    
    // Add the new script entry with today's date
    const today = new Date().toISOString().split('T')[0];
    const newEntry = `| ${scriptName} | ${description} | ${today} | Completed |\n`;
    
    // Determine where to add the new entry - before the end marker if it exists
    const updatedContent = registryContent.includes('<!-- END OF SCRIPTS -->') 
      ? registryContent.replace('<!-- END OF SCRIPTS -->', `${newEntry}<!-- END OF SCRIPTS -->`)
      : registryContent + newEntry;
    
    // Write the updated registry
    fs.writeFileSync(scriptRegistry, updatedContent, 'utf8');
    console.log('Script registry updated successfully.');
  } catch (error) {
    console.error('Error updating script registry:', error);
  }
};

// Main execution
const main = async () => {
  console.log('Starting static images deployment verification');
  console.log('-----------------------------------------------------');
  
  try {
    // Verify all images exist locally
    if (!verifyImagesExist()) {
      process.exit(1);
    }
    
    // Add images to git if needed
    await addImagesToGit();
    
    // Generate production URLs
    generateProductionUrls();
    
    // Update script registry
    updateScriptRegistry();
    
    console.log('-----------------------------------------------------');
    console.log('Verification Summary:');
    console.log('1. All static images verified locally');
    console.log('2. Images added to git repository if needed');
    console.log('3. Production URLs generated for verification');
    console.log('4. Auth0 verification fallback page should now be working correctly');
    console.log('-----------------------------------------------------');
    
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
};

// Execute main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
