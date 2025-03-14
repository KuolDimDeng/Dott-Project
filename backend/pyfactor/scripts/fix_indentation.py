#!/usr/bin/env python
"""
Script to fix indentation issues in users/models.py.
This script:
1. Reads the users/models.py file
2. Fixes the indentation issue with the closing brace in ROLE_CHOICES
3. Writes the fixed content back to the file

Usage:
python scripts/fix_indentation.py
"""

import os
import sys
import re
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Path to users/models.py
USERS_MODEL_PATH = 'users/models.py'

def fix_users_model():
    """Fix indentation issues in users/models.py"""
    try:
        # Read the file content
        with open(USERS_MODEL_PATH, 'r') as f:
            content = f.read()
        
        # Create a backup
        with open(f"{USERS_MODEL_PATH}.bak", 'w') as f:
            f.write(content)
        logger.info(f"Created backup at {USERS_MODEL_PATH}.bak")
        
        # Find the ROLE_CHOICES list
        role_choices_pattern = r"ROLE_CHOICES\s*=\s*\[(.*?)\]"
        role_choices_match = re.search(role_choices_pattern, content, re.DOTALL)
        
        if role_choices_match:
            role_choices_content = role_choices_match.group(1)
            
            # Check if there's a closing brace with incorrect indentation
            if re.search(r"\n\s+\}", role_choices_content):
                logger.info("Found incorrectly indented closing brace in ROLE_CHOICES")
                
                # Fix the indentation
                fixed_content = content.replace(
                    role_choices_content,
                    role_choices_content.replace("\n     }", "\n    }")
                )
                
                # Write the fixed content back to the file
                with open(USERS_MODEL_PATH, 'w') as f:
                    f.write(fixed_content)
                
                logger.info("Fixed indentation in ROLE_CHOICES")
                return True
            else:
                logger.info("No indentation issue found in ROLE_CHOICES")
        else:
            logger.warning("Could not find ROLE_CHOICES in users/models.py")
            
            # Try a more direct approach - replace any indented closing brace
            fixed_content = re.sub(
                r"(\n\s+)\}(\s+)",
                r"\n    }\2",
                content
            )
            
            if fixed_content != content:
                with open(USERS_MODEL_PATH, 'w') as f:
                    f.write(fixed_content)
                logger.info("Fixed indentation using direct replacement")
                return True
            else:
                logger.warning("No indentation issues found using direct replacement")
        
        # Try an even more direct approach - manually fix line 123
        lines = content.split('\n')
        if len(lines) >= 123 and lines[122].strip() == '}':
            logger.info("Found problematic line 123")
            lines[122] = '    }'
            fixed_content = '\n'.join(lines)
            
            with open(USERS_MODEL_PATH, 'w') as f:
                f.write(fixed_content)
            
            logger.info("Fixed indentation at line 123")
            return True
        
        logger.warning("Could not identify the indentation issue")
        return False
    except Exception as e:
        logger.error(f"Error fixing indentation: {str(e)}")
        return False

def main():
    """Main function"""
    logger.info("Starting indentation fix for users/models.py")
    
    if fix_users_model():
        logger.info("Successfully fixed indentation issues in users/models.py")
        logger.info("You can now run the break_circular_dependency.py script")
    else:
        logger.error("Failed to fix indentation issues")
        sys.exit(1)

if __name__ == "__main__":
    main()