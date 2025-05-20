#!/usr/bin/env python
"""
Script to fix circular dependencies in the finance/models.py file.

This script:
1. Modifies finance/models.py to replace all ForeignKey references to Business with UUID fields
2. Comments out the import from users.models
3. Updates all Meta classes to remove references to the business field in indexes

Usage:
python scripts/fix_circular_deps.py
"""

import os
import re
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_finance_models():
    """Fix circular dependencies in finance/models.py"""
    finance_models_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'finance', 'models.py')
    
    if not os.path.exists(finance_models_path):
        logger.error(f"File not found: {finance_models_path}")
        return False
    
    try:
        # Read the file
        with open(finance_models_path, 'r') as f:
            content = f.read()
        
        # Fix imports
        content = re.sub(r'from users\.models import Business', '# Temporarily commented out to break circular dependency\n# from users.models import Business', content)
        
        # Fix ForeignKey references to Business
        content = re.sub(r'business\s*=\s*models\.ForeignKey\([\'"]?users\.Business[\'"]?,\s*on_delete=models\.CASCADE.*?\)', 
                         '# Temporarily commented out to break circular dependency\n    # business = models.ForeignKey(\'users.Business\', on_delete=models.CASCADE)\n    business_id = models.UUIDField(null=True, blank=True)  # Temporary replacement', 
                         content)
        
        # Fix Meta classes with business in indexes
        content = re.sub(r'models\.Index\(fields=\[[\'"]?business[\'"]?,\s*[\'"]?(\w+)[\'"]?\]\)', 
                         '# Temporarily commented out to break circular dependency\n            # models.Index(fields=[\'business\', \'\\1\'])\n            models.Index(fields=[\'\\1\'])', 
                         content)
        
        # Fix Meta classes with business as the only field in indexes
        content = re.sub(r'models\.Index\(fields=\[[\'"]?business[\'"]?\]\)', 
                         '# Temporarily commented out to break circular dependency\n            # models.Index(fields=[\'business\'])', 
                         content)
        
        # Write the modified content back to the file
        with open(finance_models_path, 'w') as f:
            f.write(content)
        
        logger.info(f"Successfully fixed circular dependencies in {finance_models_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error fixing circular dependencies: {str(e)}")
        return False

def main():
    """Main function"""
    try:
        # Fix circular dependencies in finance/models.py
        if not fix_finance_models():
            logger.error("Failed to fix circular dependencies")
            return False
        
        logger.info("Successfully fixed all circular dependencies")
        return True
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)