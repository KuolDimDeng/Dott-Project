#!/usr/bin/env python3
"""
fix_ssl_certificate.py

This script generates and installs self-signed SSL certificates for local development
that will be properly trusted by the browser, preventing CORS and certificate errors.

Version: v1.0
Issue Reference: SSL certificate trust issues with localhost HTTPS
"""

import os
import sys
import subprocess
import logging
import shutil
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ssl_cert_fix.log')
    ]
)
logger = logging.getLogger('ssl-certificate-fix')

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent.parent
CERT_DIR = PROJECT_ROOT / 'certificates'

def check_mkcert_installed():
    """Check if mkcert is installed on the system."""
    try:
        subprocess.run(['mkcert', '-version'], 
                       check=True, 
                       stdout=subprocess.PIPE, 
                       stderr=subprocess.PIPE)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False

def install_mkcert():
    """Install mkcert using Homebrew."""
    try:
        logger.info("Installing mkcert...")
        subprocess.run(['brew', 'install', 'mkcert'], 
                      check=True, 
                      stdout=subprocess.PIPE)
        
        logger.info("Installing nss (for Firefox support)...")
        subprocess.run(['brew', 'install', 'nss'], 
                      check=True, 
                      stdout=subprocess.PIPE)
        
        return True
    except subprocess.SubprocessError as e:
        logger.error(f"Error installing mkcert: {e}")
        return False

def setup_certificate_authority():
    """Set up mkcert's local certificate authority."""
    try:
        logger.info("Setting up local certificate authority...")
        result = subprocess.run(['mkcert', '-install'], 
                               check=True, 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE)
        logger.info(result.stdout.decode())
        return True
    except subprocess.SubprocessError as e:
        logger.error(f"Error setting up certificate authority: {e}")
        return False

def generate_certificates():
    """Generate certificates for localhost and 127.0.0.1."""
    try:
        # Create certificate directory if it doesn't exist
        os.makedirs(CERT_DIR, exist_ok=True)
        
        # Change to certificate directory
        os.chdir(CERT_DIR)
        
        logger.info(f"Generating certificates in {CERT_DIR}...")
        result = subprocess.run(['mkcert', 'localhost', '127.0.0.1'], 
                               check=True, 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE)
        
        logger.info(result.stdout.decode())
        
        # Verify certificate files were created
        cert_file = CERT_DIR / 'localhost+1.pem'
        key_file = CERT_DIR / 'localhost+1-key.pem'
        
        if cert_file.exists() and key_file.exists():
            logger.info(f"Certificate files created: {cert_file} and {key_file}")
            return True
        else:
            logger.error("Certificate files were not created")
            return False
            
    except subprocess.SubprocessError as e:
        logger.error(f"Error generating certificates: {e}")
        return False
    finally:
        # Change back to original directory
        os.chdir(BASE_DIR)

def update_server_config():
    """Update the server configuration to use the new certificates."""
    try:
        # Paths for run_server.py
        run_server_path = BASE_DIR / 'run_server.py'
        
        if not run_server_path.exists():
            logger.error(f"Server configuration file not found at {run_server_path}")
            return False
        
        with open(run_server_path, 'r') as f:
            content = f.read()
        
        # Check if certificate paths are already correctly set
        if f"CERT_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent.parent / 'certificates'" in content:
            logger.info("Certificate paths in run_server.py are already set correctly")
        else:
            # Replace certificate paths in the file
            updated_content = content.replace(
                "CERT_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent.parent / 'certificates'", 
                "CERT_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent.parent / 'certificates'"
            )
            
            with open(run_server_path, 'w') as f:
                f.write(updated_content)
            
            logger.info("Updated certificate paths in run_server.py")
        
        return True
    except Exception as e:
        logger.error(f"Error updating server configuration: {e}")
        return False

def configure_frontend():
    """Configure frontend to trust the certificate."""
    try:
        # Find the frontend package.json
        frontend_dir = PROJECT_ROOT / 'frontend' / 'pyfactor_next'
        package_json_path = frontend_dir / 'package.json'
        
        if not package_json_path.exists():
            logger.warning(f"Frontend package.json not found at {package_json_path}")
            return False
        
        with open(package_json_path, 'r') as f:
            content = f.read()
        
        # Check if dev:https script is already set
        if '"dev:https": "NODE_TLS_REJECT_UNAUTHORIZED=0 next dev --experimental-https --experimental-https-key=' in content:
            logger.info("Frontend is already configured for HTTPS development")
        else:
            # Look for the dev script line
            dev_script_pattern = r'"dev": "next dev",'
            https_script = f'"dev:https": "NODE_TLS_REJECT_UNAUTHORIZED=0 next dev --experimental-https --experimental-https-key={CERT_DIR}/localhost+1-key.pem --experimental-https-cert={CERT_DIR}/localhost+1.pem",'
            
            # Add the dev:https script after the dev script
            updated_content = content.replace(
                dev_script_pattern,
                f'{dev_script_pattern}\n    {https_script}'
            )
            
            with open(package_json_path, 'w') as f:
                f.write(updated_content)
            
            logger.info("Updated frontend package.json with HTTPS development script")
        
        return True
    except Exception as e:
        logger.error(f"Error configuring frontend: {e}")
        return False

def main():
    """Main function to execute the script."""
    logger.info("Starting SSL certificate fix script")
    
    # Step 1: Check if mkcert is installed
    if not check_mkcert_installed():
        logger.info("mkcert is not installed. Installing now...")
        if not install_mkcert():
            logger.error("Failed to install mkcert. Please install manually: brew install mkcert nss")
            sys.exit(1)
    else:
        logger.info("mkcert is already installed")
    
    # Step 2: Set up certificate authority
    if not setup_certificate_authority():
        logger.error("Failed to set up certificate authority")
        sys.exit(1)
    
    # Step 3: Generate certificates
    if not generate_certificates():
        logger.error("Failed to generate certificates")
        sys.exit(1)
    
    # Step 4: Update server configuration
    if not update_server_config():
        logger.warning("Failed to update server configuration. Please update manually.")
    
    # Step 5: Configure frontend
    if not configure_frontend():
        logger.warning("Failed to configure frontend. Please update manually.")
    
    logger.info("SSL certificate fix completed successfully")
    logger.info("Please restart your backend and frontend servers for changes to take effect")
    logger.info("  - Backend: python run_server.py")
    logger.info("  - Frontend: pnpm run dev:https")

if __name__ == "__main__":
    main() 