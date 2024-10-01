import re
import csv
import json
import os
from datetime import datetime

# Path to your saved CSV file
csv_file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/Tax Foundation/2024 State Income Tax Rates and Brackets  Tax Foundation.csv'
output_file_path = '/Users/kuoldeng/projectx/backend/pyfactor/taxes/data/clean_state_tax_data.json'

# Function to clean state names by removing any text after the state name
def clean_state_name(state_name):
    # Use regex to match only the first part (the state name) and remove everything after
    return re.sub(r'[^a-zA-Z\s]', '', state_name).split()[0].strip()

# Function to process the CSV file and clean the state names
def process_tax_csv():
    state_tax_data = {}
    states_to_process = set()

    # Read the CSV file
    with open(csv_file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        headers = next(reader)  # Skip header row
        
        for row in reader:
            state_name = clean_state_name(row[0].strip())  # Clean the state name
            single_rate = row[1].strip()
            single_bracket = row[3].strip()
            married_rate = row[4].strip()
            married_bracket = row[6].strip()
            standard_deduction_single = row[7].strip()  # Assuming column 7 for standard deduction (Single)
            standard_deduction_couple = row[8].strip()  # Assuming column 8 for standard deduction (Couple)
            personal_exemption_single = row[9].strip()  # Assuming column 9 for personal exemption (Single)
            personal_exemption_couple = row[10].strip()  # Assuming column 10 for personal exemption (Couple)
            personal_exemption_dependent = row[11].strip()  # Assuming column 11 for personal exemption (Dependent)

            if state_name not in state_tax_data:
                state_tax_data[state_name] = {
                    "timestamp": datetime.now().isoformat(),
                    "tax_info": []
                }
                states_to_process.add(state_name)
            
            # Add tax info
            state_tax_data[state_name]["tax_info"].append({
                "single_rate": single_rate,
                "single_bracket": single_bracket,
                "married_rate": married_rate,
                "married_bracket": married_bracket,
                "standard_deduction_single": standard_deduction_single,
                "standard_deduction_couple": standard_deduction_couple,
                "personal_exemption_single": personal_exemption_single,
                "personal_exemption_couple": personal_exemption_couple,
                "personal_exemption_dependent": personal_exemption_dependent
            })

    return state_tax_data, states_to_process

# Save the extracted data to a JSON file
def save_tax_data(data):
    os.makedirs(os.path.dirname(output_file_path), exist_ok=True)
    with open(output_file_path, 'w') as json_file:
        json.dump(data, json_file, indent=2)
    print(f"Data successfully saved to {output_file_path}")

# Generate the summary report
def generate_summary_report(states_to_process, state_tax_data):
    successful_states = [state for state, data in state_tax_data.items() if data['tax_info']]
    failed_states = [state for state in states_to_process if state not in successful_states]

    print("\nSummary Report:")
    print(f"Total states processed: {len(states_to_process)}")
    print(f"Successful updates: {len(successful_states)} out of {len(states_to_process)}")
    print(f"Failed updates: {len(failed_states)} out of {len(states_to_process)}")

    if successful_states:
        print("\nSuccessfully updated states:")
        for state in successful_states:
            print(f"- {state}")
    
    if failed_states:
        print("\nFailed states:")
        for state in failed_states:
            print(f"- {state}")

# Main function
def main():
    state_tax_data, states_to_process = process_tax_csv()

    # Save the processed data
    save_tax_data(state_tax_data)

    # Generate the summary report
    generate_summary_report(states_to_process, state_tax_data)

if __name__ == "__main__":
    main()
