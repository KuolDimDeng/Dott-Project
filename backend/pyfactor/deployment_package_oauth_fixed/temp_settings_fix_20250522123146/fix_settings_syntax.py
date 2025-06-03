#!/usr/bin/env python3
"""
Fix Django settings syntax error caused by indentation issues
"""

def fix_settings_file():
    settings_file = 'pyfactor/settings_eb.py'
    
    try:
        # Read the current settings file
        with open(settings_file, 'r') as f:
            content = f.read()
        
        print(f"Original file size: {len(content)} characters")
        
        # Split into lines for easier processing
        lines = content.split('\n')
        fixed_lines = []
        
        # Process each line to fix indentation and syntax issues
        for i, line in enumerate(lines):
            # Skip empty lines at the end
            if i == len(lines) - 1 and line.strip() == '':
                continue
                
            # Fix common indentation issues
            if line.strip().startswith('SECURE_') or line.strip().startswith('SESSION_') or line.strip().startswith('CSRF_'):
                # These should be at top level (no indentation)
                fixed_line = line.strip()
                if fixed_line:
                    fixed_lines.append(fixed_line)
            elif line.strip().startswith('print('):
                # Print statements should also be at top level
                fixed_line = line.strip()
                if fixed_line:
                    fixed_lines.append(fixed_line)
            else:
                # Keep other lines as they are, but clean up excessive whitespace
                if line.strip():
                    fixed_lines.append(line.rstrip())
                elif fixed_lines and fixed_lines[-1].strip():  # Only add empty lines between content
                    fixed_lines.append('')
        
        # Ensure file ends with a single newline
        if fixed_lines and fixed_lines[-1] != '':
            fixed_lines.append('')
        
        # Write the fixed content back
        fixed_content = '\n'.join(fixed_lines)
        
        with open(settings_file, 'w') as f:
            f.write(fixed_content)
        
        print(f"✓ Django settings file fixed")
        print(f"Fixed file size: {len(fixed_content)} characters")
        print(f"Lines processed: {len(lines)} -> {len(fixed_lines)}")
        
        # Validate Python syntax
        try:
            compile(fixed_content, settings_file, 'exec')
            print("✓ Python syntax validation passed")
        except SyntaxError as e:
            print(f"✗ Syntax error still present: {e}")
            print(f"Line {e.lineno}: {e.text}")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Error fixing settings file: {e}")
        return False

if __name__ == '__main__':
    success = fix_settings_file()
    exit(0 if success else 1)
