import os
import json
import logging
from datetime import datetime
import re

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Function to clean and normalize state names
def normalize_state_name(state):
    # Remove any prefix like 'State of'
    state = re.sub(r'^State of\s+', '', state)
    # Remove any annotations in parentheses
    state = re.sub(r'\s*\(.*?\)', '', state)
    # Remove extra whitespace
    return state.strip()

# Function to load a JSON file
def load_json_file(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

# Function to compare two sets of tax data, allowing for order-independent comparison
def compare_tax_info(foundation_tax_info, state_tax_info):
    # Convert both lists of tax info dictionaries to sets of tuples to ignore order
    foundation_tax_set = {tuple(sorted(item.items())) for item in foundation_tax_info}
    state_tax_set = {tuple(sorted(item.items())) for item in state_tax_info}
    
    return foundation_tax_set == state_tax_set

# Main validation function
def validate_tax_data(tax_foundation_data, state_tax_data):
    discrepancies = []
    successful_states = []
    failed_states = []
    manual_data_states = []

    # Normalize state names in state_tax_data upfront
    normalized_state_tax_data = {
        normalize_state_name(state): data for state, data in state_tax_data.items()
    }

    for state, foundation_data in tax_foundation_data.items():
        normalized_state = normalize_state_name(state)
        
        # Check if normalized state exists in the state_tax_data
        if normalized_state not in normalized_state_tax_data:
            failed_states.append(state)
            discrepancies.append(f"State {state} not found in state_tax_data.json (normalized as {normalized_state})")
            continue

        foundation_tax_info = foundation_data.get('data', {}).get('tax_info', [])
        state_tax_info = normalized_state_tax_data[normalized_state].get('data', {}).get('tax_info', [])
        
        # Handle missing tax info in either dataset
        if not foundation_tax_info:
            failed_states.append(state)
            discrepancies.append(f"{normalized_state}: Tax info is missing in tax foundation data.")
            continue

        if not state_tax_info:
            failed_states.append(state)
            discrepancies.append(f"{normalized_state}: Tax info is missing in state tax data.")
            continue

        # Compare the tax info, allowing for order-independent comparison
        if not compare_tax_info(foundation_tax_info, state_tax_info):
            failed_states.append(state)
            discrepancies.append(f"{normalized_state}: Tax info mismatch between foundation data and state data.")
        else:
            successful_states.append(normalized_state)

    return {
        "summary": {
            "total_states_processed": len(tax_foundation_data),
            "successful_updates": len(successful_states),
            "failed_updates": len(failed_states),
            "states_using_manual_data": len(manual_data_states),
        },
        "successful_states": successful_states,
        "failed_states": failed_states,
        "manual_data_states": manual_data_states,
        "discrepancies": discrepancies,
        "timestamp": str(datetime.now())
    }

# Main function to run the validation and generate a report
def main():
    data_dir = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data'
    tax_foundation_file = os.path.join(data_dir, 'tax_foundation_data.json')
    state_data_file = os.path.join(data_dir, 'clean_state_tax_data.json')  # Use the clean data
    report_file = os.path.join(data_dir, 'validation_report.json')

    # Load the JSON data files
    tax_foundation_data = load_json_file(tax_foundation_file)
    state_tax_data = load_json_file(state_data_file)

    # Validate the data
    validation_report = validate_tax_data(tax_foundation_data, state_tax_data)

    # Save the validation report to a JSON file
    with open(report_file, 'w') as f:
        json.dump(validation_report, f, indent=2)

    logger.info(f"Validation report saved to {report_file}")

if __name__ == "__main__":
    main()
