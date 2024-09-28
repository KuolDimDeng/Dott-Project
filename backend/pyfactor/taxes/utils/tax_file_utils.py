import os
import json
import logging

logger = logging.getLogger(__name__)

def read_json_file(file_path):
    # Check if the file exists
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Check if the file is empty
    if os.path.getsize(file_path) == 0:
        logger.error(f"File is empty: {file_path}")
        raise ValueError(f"File is empty: {file_path}")
    
    # Attempt to read the file
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
            if not data:  # Check if the JSON object is empty
                logger.error(f"File contains empty JSON object: {file_path}")
                raise ValueError(f"File contains empty JSON object: {file_path}")
            logger.debug(f"Successfully read data from {file_path}")
            return data
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from file: {file_path}. Error: {e}")
        raise

def scrape_federal_tax_data():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    
    federal_tax_data_file = os.path.join(data_dir, 'federal_tax_data.json')
    
    # Ensure data directory exists
    os.makedirs(data_dir, exist_ok=True)
    
    # Read the federal tax data
    try:
        federal_tax_data = read_json_file(federal_tax_data_file)
        logger.debug(f"Federal tax data: {federal_tax_data}")
        return federal_tax_data
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as e:
        logger.error(f"Error processing federal tax data: {e}")
        # Handle the error or raise it further
        raise