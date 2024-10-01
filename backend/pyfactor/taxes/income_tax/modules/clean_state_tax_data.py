import json
from datetime import datetime

# Helper function to clean and structure tax data
def clean_tax_data(state_data):
    cleaned_data = {}
    for state, data in state_data.items():
        tax_info_list = data.get('data', {}).get('tax_info', [])
        cleaned_tax_info = []

        # Iterate through each tax info item
        for tax_info in tax_info_list:
            if isinstance(tax_info, dict):
                # Assuming tax_rate and date_range for both single and married rates
                cleaned_info = {
                    "single_rate": tax_info.get('single_rate', tax_info.get('tax_rate', 'none')),
                    "single_bracket": tax_info.get('single_bracket', tax_info.get('date_range', '')),
                    "married_rate": tax_info.get('married_rate', tax_info.get('tax_rate', 'none')),
                    "married_bracket": tax_info.get('married_bracket', tax_info.get('date_range', ''))
                }
            else:
                # If tax_info is unstructured, assume default "none" values
                cleaned_info = {
                    "single_rate": "none",
                    "single_bracket": "",
                    "married_rate": "none",
                    "married_bracket": ""
                }
            cleaned_tax_info.append(cleaned_info)

        # Add the cleaned tax info to the final dictionary with timestamp
        cleaned_data[state] = {
            "timestamp": str(datetime.now()),
            "tax_info": cleaned_tax_info
        }

    return cleaned_data

# Function to load JSON data
def load_json_file(filepath):
    with open(filepath, 'r') as file:
        return json.load(file)

# Function to save cleaned data to JSON file
def save_json_file(filepath, data):
    with open(filepath, 'w') as file:
        json.dump(data, file, indent=4)

# Main function
def main():
    # Define the paths for input and output files
    input_file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/state_tax_data.json'
    output_file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/clean_state_tax_data.json'

    # Load the raw state tax data
    state_tax_data = load_json_file(input_file_path)

    # Clean the state tax data
    cleaned_data = clean_tax_data(state_tax_data)

    # Save the cleaned data to the output file
    save_json_file(output_file_path, cleaned_data)

    print(f"Cleaned data saved to {output_file_path}")

# Run the main function
if __name__ == "__main__":
    main()
